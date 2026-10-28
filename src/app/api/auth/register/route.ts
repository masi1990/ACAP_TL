import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { appendAuditEvent } from "@/lib/audit";
import { isCountryCode } from "@/lib/countries";
import { replaceOrgRole } from "@/lib/org-accounts";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const email = String(body.email || "").toLowerCase().trim();
  const password = String(body.password || "");
  const organizationName = String(body.organizationName || "").trim();
  const type = String(body.type || "MANUFACTURER").toUpperCase();
  const countryIso2 = String(body.countryIso2 || "").trim().toUpperCase();
  const cbId = String(body.certifyingCbId || "").trim();

  if (!name || !organizationName) {
    return NextResponse.json({ error: "Name and organisation are required" }, { status: 400 });
  }
  if (!email.includes("@")) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (password.length < 8) {
    return NextResponse.json({ error: "Choose a password of at least 8 characters" }, { status: 400 });
  }
  if (type !== "MANUFACTURER" && type !== "IMPORTER") {
    return NextResponse.json({ error: "Choose manufacturer or importer" }, { status: 400 });
  }
  if (!isCountryCode(countryIso2)) return NextResponse.json({ error: "Choose a country" }, { status: 400 });

  const existing = await prisma.userAccount.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });

  const cb = cbId ? await prisma.organization.findUnique({ where: { id: cbId } }) : null;
  if (cbId && (!cb || cb.type !== "CB" || cb.status === "SUSPENDED")) {
    return NextResponse.json({ error: "Choose an active certification body" }, { status: 400 });
  }
  const memberState = await prisma.memberState.findUnique({ where: { iso2: countryIso2 } });

  const user = await prisma.userAccount.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      emailVerified: true,
    },
  });
  const organization = await prisma.organization.create({
    data: {
      name: organizationName,
      type,
      memberStateId: memberState?.id,
      servicingCbId: cb?.id,
      contactEmail: email,
      primaryAdminId: user.id,
    },
  });
  const account = await prisma.clientAccount.create({
    data: { organizationId: organization.id, displayName: organizationName },
  });
  await prisma.company.create({
    data: { clientAccountId: account.id, legalName: organizationName, countryIso2 },
  });
  await replaceOrgRole({
    userId: user.id,
    organizationId: organization.id,
    roleCode: "PRIMARY_ADMIN",
    grantedById: user.id,
  });
  await appendAuditEvent({
    actorUserId: user.id,
    action: "ACCOUNT_REGISTER",
    entityType: "Organization",
    entityId: organization.id,
    organizationId: organization.id,
    after: { email, type },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
