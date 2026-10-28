import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";
import { orgStatusOrNull } from "@/lib/cb-profile";
import { AUTHORITY_TYPES, isAuthorityType, isTradeOrgType } from "@/lib/rbac";
import { notifyAfterCommit, queueAccountWelcome } from "@/lib/notifications";
import { saveCbMarkLicences } from "@/lib/cb-licenses";
import { replaceOrgRole } from "@/lib/org-accounts";
import { resolveInstitutionShape, saveCompanyCountries, saveOperatingCountries } from "@/lib/institution-shape";

function profileFrom(body: Record<string, unknown>) {
  const status =
    body.status != null && String(body.status).trim() ? orgStatusOrNull(body.status) : "ACTIVE";
  if (body.status != null && String(body.status).trim() && !status) {
    return { error: "Choose an organisation status from the list" };
  }
  return {
    error: null as string | null,
    data: {
      accreditationBody: String(body.accreditationBody || "").trim(),
      accreditationRef: String(body.accreditationRef || "").trim(),
      contactEmail: String(body.contactEmail || "").trim(),
      contactPhone: String(body.contactPhone || "").trim(),
      addressLine: String(body.addressLine || "").trim(),
      website: String(body.website || "").trim(),
      status: status || "ACTIVE",
    },
  };
}

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind"); // cb | manufacturer | institution
  const permission =
    kind === "institution" ? "institutions:read" : kind === "cb" ? "cb:read" : "manufacturer:read";
  const auth = await requirePermission(permission);
  if (auth.error) return auth.error;

  const types =
    kind === "institution"
      ? [...AUTHORITY_TYPES]
      : kind === "cb"
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
  const authority = isAuthorityType(type);
  if (!isTrade && !authority) {
    return NextResponse.json(
      { error: "Choose a manufacturer, importer, or a public authority" },
      { status: 400 },
    );
  }

  const auth = await requirePermission(authority ? "institutions:write" : "manufacturer:write");
  if (auth.error) return auth.error;

  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const memberStateId = body.memberStateId ? String(body.memberStateId) : null;
  const shape = await resolveInstitutionShape({
    type,
    backing: body.backing,
    alsoCertifies: body.alsoCertifies,
    memberStateId,
    operatingCountryIds: body.operatingCountryIds,
    requireCountry: authority || isTrade,
  });
  if (shape.error) return NextResponse.json({ error: shape.error }, { status: 400 });
  if ((authority || isTrade) && shape.shape.backing !== "PRIVATE" && !shape.shape.memberStateId) {
    return NextResponse.json({ error: "Choose a member state" }, { status: 400 });
  }
  const memberState = memberStateId
    ? await prisma.memberState.findUnique({ where: { id: memberStateId } })
    : null;
  if (memberStateId && !memberState) {
    return NextResponse.json({ error: "Choose a member state from the list" }, { status: 400 });
  }

  const profile = profileFrom(body);
  if (profile.error) return NextResponse.json({ error: profile.error }, { status: 400 });

  let servicingCbId: string | null = null;
  if (body.servicingCbId) {
    const cb = await prisma.organization.findFirst({
      where: { id: String(body.servicingCbId), type: "CB" },
    });
    if (!cb) return NextResponse.json({ error: "Choose a certification body from the list" }, { status: 400 });
    servicingCbId = cb.id;
  }

  const adminEmail = body.adminEmail ? String(body.adminEmail).trim().toLowerCase() : null;
  const adminName = body.adminName ? String(body.adminName).trim() : name + " Admin";
  const adminPassword = body.adminPassword ? String(body.adminPassword) : "ChangeMe!ACAP";

  let primaryAdminId: string | undefined;
  let createdAccount = false;
  if (adminEmail) {
    const existing = await prisma.userAccount.findUnique({ where: { email: adminEmail } });
    if (existing) {
      primaryAdminId = existing.id;
    } else {
      createdAccount = true;
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
      memberStateId: shape.shape.memberStateId,
      backing: shape.shape.backing,
      alsoCertifies: shape.shape.alsoCertifies,
      primaryAdminId,
      servicingCbId,
      ...profile.data,
    },
  });

  if (isCb) {
    const licence = await saveCbMarkLicences(org.id, body);
    if (licence.error) {
      await prisma.organizationMembership.deleteMany({ where: { organizationId: org.id } });
      await prisma.organization.delete({ where: { id: org.id } });
      if (createdAccount && primaryAdminId) {
        await prisma.userAccount.delete({ where: { id: primaryAdminId } });
      }
      return NextResponse.json({ error: licence.error }, { status: 400 });
    }
  }

  if (shape.shape.operatingCountryIds.length) {
    await saveOperatingCountries(org.id, shape.shape.operatingCountryIds);
  }

  if (primaryAdminId) {
    await replaceOrgRole({
      userId: primaryAdminId,
      organizationId: org.id,
      roleCode: "PRIMARY_ADMIN",
      grantedById: auth.session!.userId,
    });
  }

  if (isTrade) {
    const client = await prisma.clientAccount.create({
      data: {
        organizationId: org.id,
        displayName: body.displayName ? String(body.displayName) : name,
      },
    });
    await prisma.company.create({
      data: {
        clientAccountId: client.id,
        legalName: String(body.legalName || name),
        countryIso2: (memberState?.iso2 || String(body.countryIso2 || "")).toUpperCase().slice(0, 2) || "KE",
      },
    });
    const company = await prisma.company.findFirst({ where: { clientAccountId: client.id } });
    if (company && Array.isArray(body.operatingCountryIds)) {
      await saveCompanyCountries(company.id, body.operatingCountryIds.map((id: unknown) => String(id)));
    }
  }

  if (createdAccount && primaryAdminId && adminEmail) {
    await queueAccountWelcome({
      userId: primaryAdminId,
      email: adminEmail,
      name: adminName,
      temporaryPassword: adminPassword,
    });
  }
  await notifyAfterCommit();

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: authority ? "INSTITUTION_CREATE" : "MANUFACTURER_CREATE",
    entityType: "Organization",
    entityId: org.id,
    organizationId: org.id,
    after: { name, type },
  });

  return NextResponse.json({ ok: true, row: org }, { status: 201 });
}
