import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";
import {
  ALL_PERMISSIONS,
  SYSTEM_ROLE_DEFS,
  isArsoAdmin,
  type Permission,
} from "@/lib/rbac";

export async function GET() {
  const auth = await requirePermission("roles:read");
  if (auth.error) return auth.error;

  const [roles, assignments, users] = await Promise.all([
    prisma.roleDefinition.findMany({
      orderBy: [{ scope: "asc" }, { code: "asc" }],
      include: { _count: { select: { assignments: true } } },
    }),
    prisma.userRoleAssignment.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
        role: { select: { code: true, name: true, scope: true } },
      },
      orderBy: { grantedAt: "desc" },
    }),
    prisma.userAccount.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        rolesGlobal: true,
        memberships: { include: { organization: { select: { id: true, name: true, type: true } } } },
      },
      orderBy: { email: "asc" },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    roles,
    assignments,
    users,
    allPermissions: ALL_PERMISSIONS,
    systemRoleCodes: SYSTEM_ROLE_DEFS.map((r) => r.code),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("roles:write");
  if (auth.error) return auth.error;
  const body = await req.json();

  const code = String(body.code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_");
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim();
  const scope = body.scope === "ORG" ? "ORG" : "GLOBAL";
  const rawPerms: string[] = Array.isArray(body.permissions)
    ? body.permissions.map(String)
    : typeof body.permissions === "string"
      ? body.permissions.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

  if (!code || !name) {
    return NextResponse.json({ error: "code and name are required" }, { status: 400 });
  }

  const allowed = new Set(ALL_PERMISSIONS);
  const permissions = rawPerms.filter((p) => allowed.has(p as Permission)) as Permission[];
  if (permissions.length === 0) {
    return NextResponse.json({ error: "Select at least one valid permission" }, { status: 400 });
  }

  // Least privilege: custom roles cannot include roles:write or impersonate unless creator is ARSO_ADMIN
  const elevated = ["roles:write", "roles:assign", "impersonate"] as const;
  const isAdmin = isArsoAdmin(auth.session!.user);
  if (!isAdmin && permissions.some((p) => elevated.includes(p as (typeof elevated)[number]))) {
    return NextResponse.json(
      { error: "Only ARSO_ADMIN may grant roles:write, roles:assign, or impersonate on a custom role" },
      { status: 403 },
    );
  }

  const existing = await prisma.roleDefinition.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: `Role code ${code} already exists` }, { status: 409 });
  }

  const role = await prisma.roleDefinition.create({
    data: {
      id: `role-${randomBytes(4).toString("hex")}`,
      code,
      name,
      description,
      scope,
      permissionsJson: JSON.stringify(permissions),
      isSystem: false,
    },
  });

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "ROLE_CREATE",
    entityType: "RoleDefinition",
    entityId: role.id,
    after: { code, permissions },
  });

  return NextResponse.json({ ok: true, role }, { status: 201 });
}
