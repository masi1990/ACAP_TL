import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";
import { orgStatusOrNull } from "@/lib/cb-profile";
import { isAuthorityType, isTradeOrgType, permissionsFromAssignedRoles } from "@/lib/rbac";
import { isCountryCode } from "@/lib/countries";
import { notifyAfterCommit } from "@/lib/notifications";
import { saveCbMarkLicences } from "@/lib/cb-licenses";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const before = await prisma.organization.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const authority = isAuthorityType(before.type);
  const permission = authority ? "institutions:write" : "manufacturer:write";
  const auth = await requirePermission(permission);
  if (auth.error) return auth.error;

  // A write permission on an assigned role covers every organisation of that kind.
  // The same permission coming only from a membership stays inside that organisation.
  const isHub = permissionsFromAssignedRoles(auth.session!.user).has(permission);
  if (!isHub) {
    const member = auth.session!.user.memberships.some(
      (m) => m.organizationId === id || m.organization?.id === id,
    );
    if (!member) {
      return NextResponse.json({ error: "Forbidden — not a member of this organization" }, { status: 403 });
    }
  }

  const body = await req.json();
  if (body.memberStateId) {
    const state = await prisma.memberState.findUnique({ where: { id: String(body.memberStateId) } });
    if (!state) return NextResponse.json({ error: "Choose a member state from the list" }, { status: 400 });
  }
  if (before.type === "CB" && body.memberStateId === "") {
    return NextResponse.json({ error: "Choose a member state" }, { status: 400 });
  }
  const status =
    body.status != null && String(body.status).trim() ? orgStatusOrNull(body.status) : undefined;
  if (body.status != null && String(body.status).trim() && !status) {
    return NextResponse.json({ error: "Choose an organisation status from the list" }, { status: 400 });
  }
  let servicingCbId: string | null | undefined;
  if (body.servicingCbId !== undefined) {
    if (!body.servicingCbId) servicingCbId = null;
    else {
      const cb = await prisma.organization.findFirst({
        where: { id: String(body.servicingCbId), type: "CB" },
      });
      if (!cb) return NextResponse.json({ error: "Choose a certification body from the list" }, { status: 400 });
      servicingCbId = cb.id;
    }
  }

  const row = await prisma.organization.update({
    where: { id },
    data: {
      name: body.name != null ? String(body.name).trim() : undefined,
      memberStateId: body.memberStateId === undefined ? undefined : body.memberStateId || null,
      type:
        body.type != null &&
        (isAuthorityType(String(body.type)) || isTradeOrgType(String(body.type)))
          ? String(body.type).toUpperCase()
          : undefined,
      accreditationBody: body.accreditationBody != null ? String(body.accreditationBody).trim() : undefined,
      accreditationRef: body.accreditationRef != null ? String(body.accreditationRef).trim() : undefined,
      contactEmail: body.contactEmail != null ? String(body.contactEmail).trim() : undefined,
      contactPhone: body.contactPhone != null ? String(body.contactPhone).trim() : undefined,
      addressLine: body.addressLine != null ? String(body.addressLine).trim() : undefined,
      website: body.website != null ? String(body.website).trim() : undefined,
      status: typeof status === "string" ? status : undefined,
      servicingCbId,
    },
  });

  if (before.type === "CB" || row.type === "CB") {
    const licence = await saveCbMarkLicences(id, body);
    if (licence.error) return NextResponse.json({ error: licence.error }, { status: 400 });
    if (licence.id) await notifyAfterCommit();
  }

  const legalName = body.legalName != null ? String(body.legalName).trim() : undefined;
  const countryIso2 = body.countryIso2 != null ? String(body.countryIso2).trim().toUpperCase() : undefined;
  if (countryIso2 && !isCountryCode(countryIso2)) {
    return NextResponse.json({ error: "Choose a country" }, { status: 400 });
  }
  if (legalName || countryIso2) {
    const accounts = await prisma.clientAccount.findMany({
      where: { organizationId: id },
      include: { companies: true },
    });
    const companies = accounts.flatMap((account) => account.companies);
    if (companies.length === 0 && isTradeOrgType(row.type)) {
      const account = await prisma.clientAccount.create({
        data: { organizationId: id, displayName: row.name },
      });
      await prisma.company.create({
        data: {
          clientAccountId: account.id,
          legalName: legalName || row.name,
          countryIso2: countryIso2 || "KE",
        },
      });
    } else {
      for (const company of companies) {
        await prisma.company.update({
          where: { id: company.id },
          data: {
            legalName: legalName || undefined,
            countryIso2,
          },
        });
      }
    }
  }

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "ORG_UPDATE",
    entityType: "Organization",
    entityId: id,
    organizationId: id,
    before: before,
    after: row,
  });
  return NextResponse.json({ ok: true, row });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const before = await prisma.organization.findUnique({
    where: { id },
    include: {
      _count: { select: { applications: true, cbLicenses: true, clientAccounts: true } },
    },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const permission = isAuthorityType(before.type) ? "institutions:delete" : "manufacturer:delete";
  const auth = await requirePermission(permission);
  if (auth.error) return auth.error;

  if (before._count.applications > 0) {
    return NextResponse.json(
      { error: "Organization has applications — withdraw those first" },
      { status: 409 },
    );
  }
  const productCount = await prisma.product.count({
    where: { company: { clientAccount: { organizationId: id } } },
  });
  if (productCount > 0) {
    return NextResponse.json(
      { error: "Remove this organisation's products on the certification page first" },
      { status: 409 },
    );
  }
  const licences = await prisma.cbLicense.findMany({
    where: { organizationId: id },
    include: { _count: { select: { sublicenses: true } } },
  });
  if (licences.some((licence) => licence._count.sublicenses > 0)) {
    return NextResponse.json(
      { error: "Organization has sub-licences — withdraw those first" },
      { status: 409 },
    );
  }
  await prisma.cbLicense.deleteMany({ where: { organizationId: id } });
  await prisma.invitation.deleteMany({ where: { organizationId: id } });
  await prisma.userRoleAssignment.deleteMany({ where: { organizationId: id } });
  await prisma.organizationMembership.deleteMany({ where: { organizationId: id } });
  const clients = await prisma.clientAccount.findMany({ where: { organizationId: id } });
  for (const c of clients) {
    const companies = await prisma.company.findMany({ where: { clientAccountId: c.id } });
    for (const co of companies) {
      await prisma.product.deleteMany({ where: { companyId: co.id } });
    }
    await prisma.company.deleteMany({ where: { clientAccountId: c.id } });
  }
  await prisma.clientAccount.deleteMany({ where: { organizationId: id } });
  await prisma.organization.delete({ where: { id } });

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: isAuthorityType(before.type) ? "INSTITUTION_DELETE" : "MANUFACTURER_DELETE",
    entityType: "Organization",
    entityId: id,
    before: { name: before.name, type: before.type },
  });
  return NextResponse.json({ ok: true });
}
