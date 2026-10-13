import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";
import { ALL_PERMISSIONS, isArsoAdmin, type Permission } from "@/lib/rbac";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("roles:read");
  if (auth.error) return auth.error;
  const { code } = await ctx.params;
  const role = await prisma.roleDefinition.findUnique({
    where: { code: decodeURIComponent(code) },
    include: {
      assignments: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, role });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("roles:write");
  if (auth.error) return auth.error;
  const { code: raw } = await ctx.params;
  const code = decodeURIComponent(raw);
  const body = await req.json();
  const before = await prisma.roleDefinition.findUnique({ where: { code } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (before.isSystem && body.permissions != null && !isArsoAdmin(auth.session!.user)) {
    return NextResponse.json(
      { error: "System role permissions are locked — only ARSO_ADMIN may change them" },
      { status: 403 },
    );
  }

  let permissionsJson: string | undefined;
  if (body.permissions != null) {
    const rawPerms: string[] = Array.isArray(body.permissions)
      ? body.permissions.map(String)
      : String(body.permissions)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    const allowed = new Set(ALL_PERMISSIONS);
    const permissions = rawPerms.filter((p) => allowed.has(p as Permission));
    if (permissions.length === 0) {
      return NextResponse.json({ error: "Select at least one valid permission" }, { status: 400 });
    }
    permissionsJson = JSON.stringify(permissions);
  }

  const role = await prisma.roleDefinition.update({
    where: { code },
    data: {
      name: body.name != null ? String(body.name).trim() : undefined,
      description: body.description != null ? String(body.description) : undefined,
      permissionsJson,
    },
  });

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "ROLE_UPDATE",
    entityType: "RoleDefinition",
    entityId: role.id,
    before: { code: before.code, permissionsJson: before.permissionsJson },
    after: { code: role.code, permissionsJson: role.permissionsJson },
  });

  return NextResponse.json({ ok: true, role });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("roles:write");
  if (auth.error) return auth.error;
  const { code: raw } = await ctx.params;
  const code = decodeURIComponent(raw);
  const before = await prisma.roleDefinition.findUnique({
    where: { code },
    include: { _count: { select: { assignments: true } } },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before.isSystem) {
    return NextResponse.json({ error: "Cannot delete a system role" }, { status: 409 });
  }
  if (before._count.assignments > 0) {
    return NextResponse.json(
      { error: "Role still has assignments — revoke them first" },
      { status: 409 },
    );
  }
  await prisma.roleDefinition.delete({ where: { code } });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "ROLE_DELETE",
    entityType: "RoleDefinition",
    entityId: before.id,
    before: { code },
  });
  return NextResponse.json({ ok: true });
}
