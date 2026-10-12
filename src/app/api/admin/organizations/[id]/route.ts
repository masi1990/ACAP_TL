import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";
import { can, isTradeOrgType } from "@/lib/rbac";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const before = await prisma.organization.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const permission = before.type === "CB" ? "cb:write" : "manufacturer:write";
  const auth = await requirePermission(permission);
  if (auth.error) return auth.error;

  // Least privilege: non-ARSO users may only edit orgs they belong to
  const isHub =
    can(auth.session!.user, "cb:delete") ||
    auth.session!.user.rolesGlobal.includes("ARSO_ADMIN") ||
    auth.session!.user.rolesGlobal.includes("ARSO_SUPPORT");
  if (!isHub) {
    const member = auth.session!.user.memberships.some(
      (m) => m.organizationId === id || m.organization?.id === id,
    );
    if (!member) {
      return NextResponse.json({ error: "Forbidden — not a member of this organization" }, { status: 403 });
    }
  }

  const body = await req.json();
  const row = await prisma.organization.update({
    where: { id },
    data: {
      name: body.name != null ? String(body.name).trim() : undefined,
      memberStateId: body.memberStateId === undefined ? undefined : body.memberStateId || null,
      type:
        body.type != null && (body.type === "CB" || isTradeOrgType(String(body.type)))
          ? String(body.type).toUpperCase()
          : undefined,
    },
  });

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

  const permission = before.type === "CB" ? "cb:delete" : "manufacturer:delete";
  const auth = await requirePermission(permission);
  if (auth.error) return auth.error;

  if (before._count.applications > 0 || before._count.cbLicenses > 0) {
    return NextResponse.json(
      { error: "Organization has licences or applications — withdraw those first" },
      { status: 409 },
    );
  }

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
    action: before.type === "CB" ? "CB_DELETE" : "MANUFACTURER_DELETE",
    entityType: "Organization",
    entityId: id,
    before: { name: before.name, type: before.type },
  });
  return NextResponse.json({ ok: true });
}
