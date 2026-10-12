import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";
import { parseGlobalRoles } from "@/lib/rbac";

/** Assign a role to a user (least privilege — requires roles:assign). */
export async function POST(req: NextRequest) {
  const auth = await requirePermission("roles:assign");
  if (auth.error) return auth.error;
  const body = await req.json();

  const userId = String(body.userId || "").trim();
  const roleCode = String(body.roleCode || "").trim();
  const organizationId = body.organizationId ? String(body.organizationId).trim() : null;

  if (!userId || !roleCode) {
    return NextResponse.json({ error: "userId and roleCode are required" }, { status: 400 });
  }

  const [user, role] = await Promise.all([
    prisma.userAccount.findUnique({ where: { id: userId } }),
    prisma.roleDefinition.findUnique({ where: { code: roleCode } }),
  ]);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  if (role.scope === "ORG" && !organizationId) {
    return NextResponse.json({ error: "organizationId required for ORG-scoped roles" }, { status: 400 });
  }
  if (role.scope === "GLOBAL" && organizationId) {
    return NextResponse.json({ error: "GLOBAL roles cannot be org-scoped" }, { status: 400 });
  }

  // Cannot assign ARSO_ADMIN unless actor is ARSO_ADMIN
  if (roleCode === "ARSO_ADMIN" && !auth.session!.user.rolesGlobal.includes("ARSO_ADMIN")) {
    return NextResponse.json({ error: "Only ARSO_ADMIN may assign ARSO_ADMIN" }, { status: 403 });
  }

  const existing = await prisma.userRoleAssignment.findFirst({
    where: {
      userId,
      roleCode,
      organizationId: organizationId ?? null,
    },
  });

  const assignment = existing
    ? await prisma.userRoleAssignment.update({
        where: { id: existing.id },
        data: {
          grantedById: auth.session!.userId,
          grantedAt: new Date(),
        },
      })
    : await prisma.userRoleAssignment.create({
        data: {
          id: `ura-${randomBytes(4).toString("hex")}`,
          userId,
          roleCode,
          organizationId,
          grantedById: auth.session!.userId,
        },
      });

  // Keep legacy rolesGlobal in sync for GLOBAL roles
  if (role.scope === "GLOBAL") {
    const current = parseGlobalRoles(user.rolesGlobal);
    if (!current.includes(roleCode)) {
      const next = [...current, roleCode].join(",");
      await prisma.userAccount.update({ where: { id: userId }, data: { rolesGlobal: next } });
    }
  }

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "ROLE_ASSIGN",
    entityType: "UserRoleAssignment",
    entityId: assignment.id,
    after: { userId, roleCode, organizationId },
  });

  return NextResponse.json({ ok: true, assignment }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePermission("roles:assign");
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => ({}));
  const assignmentId = String(body.id || body.assignmentId || "").trim();
  if (!assignmentId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const before = await prisma.userRoleAssignment.findUnique({
    where: { id: assignmentId },
    include: { role: true, user: true },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (
    before.roleCode === "ARSO_ADMIN" &&
    !auth.session!.user.rolesGlobal.includes("ARSO_ADMIN")
  ) {
    return NextResponse.json({ error: "Only ARSO_ADMIN may revoke ARSO_ADMIN" }, { status: 403 });
  }

  // Prevent locking yourself out of the last ARSO_ADMIN
  if (before.roleCode === "ARSO_ADMIN") {
    const adminCount = await prisma.userRoleAssignment.count({ where: { roleCode: "ARSO_ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Cannot revoke the last ARSO_ADMIN assignment" }, { status: 409 });
    }
  }

  await prisma.userRoleAssignment.delete({ where: { id: assignmentId } });

  if (before.role.scope === "GLOBAL") {
    const current = parseGlobalRoles(before.user.rolesGlobal).filter((c) => c !== before.roleCode);
    await prisma.userAccount.update({
      where: { id: before.userId },
      data: { rolesGlobal: current.join(",") },
    });
  }

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "ROLE_REVOKE",
    entityType: "UserRoleAssignment",
    entityId: assignmentId,
    before: { userId: before.userId, roleCode: before.roleCode },
  });

  return NextResponse.json({ ok: true });
}
