import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";
import { isTradeOrgType } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind"); // cb | manufacturer
  const permission = kind === "cb" ? "cb:read" : "manufacturer:read";
  const auth = await requirePermission(permission);
  if (auth.error) return auth.error;

  const types =
    kind === "cb"
      ? ["CB"]
      : kind === "manufacturer"
        ? ["MANUFACTURER", "IMPORTER", "CLIENT"]
        : ["CB", "MANUFACTURER", "IMPORTER", "CLIENT"];

  const rows = await prisma.organization.findMany({
    where: { type: { in: types } },
    include: {
      memberState: true,
      memberships: { include: { user: { select: { id: true, email: true, name: true } } } },
      clientAccounts: { include: { companies: true } },
      cbLicenses: true,
      _count: { select: { applications: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const type = String(body.type || "").toUpperCase();
  const isCb = type === "CB";
  const isTrade = isTradeOrgType(type);
  const operational = type === "CUSTOMS" || type === "NSB" || type === "MARKET_SURVEILLANCE";
  if (!isCb && !isTrade && !operational) {
    return NextResponse.json(
      { error: "type must be a manufacturer, importer, certification body, customs authority, inspectorate, or market surveillance authority" },
      { status: 400 },
    );
  }

  const auth = await requirePermission(isCb ? "cb:write" : "manufacturer:write");
  if (auth.error) return auth.error;

  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const memberStateId = body.memberStateId ? String(body.memberStateId) : null;
  if (memberStateId) {
    const ms = await prisma.memberState.findUnique({ where: { id: memberStateId } });
    if (!ms) return NextResponse.json({ error: "memberStateId not found" }, { status: 400 });
  }

  const adminEmail = body.adminEmail ? String(body.adminEmail).trim().toLowerCase() : null;
  const adminName = body.adminName ? String(body.adminName).trim() : name + " Admin";
  const adminPassword = body.adminPassword ? String(body.adminPassword) : "ChangeMe!ACAP";

  let primaryAdminId: string | undefined;
  if (adminEmail) {
    const existing = await prisma.userAccount.findUnique({ where: { email: adminEmail } });
    if (existing) {
      primaryAdminId = existing.id;
    } else {
      const user = await prisma.userAccount.create({
        data: {
          email: adminEmail,
          name: adminName,
          passwordHash: await bcrypt.hash(adminPassword, 10),
          emailVerified: true,
          rolesGlobal: "",
        },
      });
      primaryAdminId = user.id;
    }
  }

  const org = await prisma.organization.create({
    data: {
      name,
      type,
      memberStateId,
      primaryAdminId,
    },
  });

  if (primaryAdminId) {
    await prisma.organizationMembership.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId: primaryAdminId } },
      create: {
        organizationId: org.id,
        userId: primaryAdminId,
        role:
          type === "CB"
            ? "CB_OFFICER"
            : type === "CUSTOMS"
              ? "CUSTOMS_OFFICER"
              : type === "NSB"
                ? "INSPECTOR"
                : type === "MARKET_SURVEILLANCE"
                  ? "SURVEILLANCE_OFFICER"
                  : "PRIMARY_ADMIN",
      },
      update: {
        role:
          type === "CB"
            ? "CB_OFFICER"
            : type === "CUSTOMS"
              ? "CUSTOMS_OFFICER"
              : type === "NSB"
                ? "INSPECTOR"
                : type === "MARKET_SURVEILLANCE"
                  ? "SURVEILLANCE_OFFICER"
                  : "PRIMARY_ADMIN",
      },
    });
  }

  if (isTrade) {
    const client = await prisma.clientAccount.create({
      data: {
        organizationId: org.id,
        displayName: body.displayName ? String(body.displayName) : name,
      },
    });
    if (body.legalName || body.countryIso2) {
      await prisma.company.create({
        data: {
          clientAccountId: client.id,
          legalName: String(body.legalName || name),
          countryIso2: String(body.countryIso2 || "KE").toUpperCase().slice(0, 2),
        },
      });
    }
  }

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: isCb ? "CB_CREATE" : "MANUFACTURER_CREATE",
    entityType: "Organization",
    entityId: org.id,
    organizationId: org.id,
    after: { name, type },
  });

  return NextResponse.json({ ok: true, row: org }, { status: 201 });
}
