import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";
import { assignableOrgRoles, canAssignAcrossOrganisations, isArsoAdmin, isAuthorityType, parseGlobalRoles } from "@/lib/rbac";
import { removeOrgRole, replaceOrgRole } from "@/lib/org-accounts";

type SessionUser = {
  rolesGlobal: string;
  memberships: Array<{ role: string; organization: { id: string; type: string; memberStateId?: string | null } }>;
  roleAssignments?: Array<{ roleCode: string; role?: { permissionsJson?: string; scope?: string } }>;
};

function orgRoleAllowed(
  actor: SessionUser,
  organization: { id: string; type: string; memberStateId: string | null } | null,
  roleCode: string,
  scope: string,
) {
  if (canAssignAcrossOrganisations(actor)) return null;
  if (scope === "GLOBAL" || roleCode.startsWith("ARSO_")) {
    return "Only ARSO can assign a hub role";
  }
  if (!organization) return "Choose the organisation";
  if (roleCode === "PRIMARY_ADMIN") return "Only ARSO can set the main account";
  const ownsOrg = actor.memberships.some(
    (item) => item.role === "PRIMARY_ADMIN" && item.organization.id === organization.id,
  );
  const ownsCountry =
    isAuthorityType(organization.type) &&
    !!organization.memberStateId &&
    actor.memberships.some(
      (item) =>
        item.role === "PRIMARY_ADMIN" &&
        isAuthorityType(item.organization.type) &&
        item.organization.memberStateId === organization.memberStateId,
    );
  if (!ownsOrg && !ownsCountry) return "You can add members only for your country";
  if (!assignableOrgRoles(organization.type).includes(roleCode)) {
    return "Choose a role this organisation can grant";
  }
  return null;
}

/** Assign a role to a user. ARSO may assign any role. A main account may assign only inside its organisation. */
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

  const [user, role, organization] = await Promise.all([
    prisma.userAccount.findUnique({ where: { id: userId } }),
    prisma.roleDefinition.findUnique({ where: { code: roleCode } }),
    organizationId ? prisma.organization.findUnique({ where: { id: organizationId } }) : Promise.resolve(null),
  ]);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (organizationId && !organization) return NextResponse.json({ error: "Organisation not found" }, { status: 404 });

  if (role.scope === "ORG" && !organizationId) {
    return NextResponse.json({ error: "organizationId required for ORG-scoped roles" }, { status: 400 });
  }
  if (role.scope === "GLOBAL" && organizationId) {
    return NextResponse.json({ error: "GLOBAL roles cannot be org-scoped" }, { status: 400 });
  }

  const denied = orgRoleAllowed(auth.session!.user, organization, roleCode, role.scope);
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });

  if (roleCode === "ARSO_ADMIN" && !isArsoAdmin(auth.session!.user)) {
    return NextResponse.json({ error: "Only ARSO_ADMIN may assign ARSO_ADMIN" }, { status: 403 });
  }

  if (organizationId && roleCode !== "PRIMARY_ADMIN") {
    const current = await prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (current?.role === "PRIMARY_ADMIN") {
      const mainAccounts = await prisma.organizationMembership.count({
        where: { organizationId, role: "PRIMARY_ADMIN" },
      });
      if (mainAccounts <= 1) {
        return NextResponse.json({ error: "This organisation needs a main account" }, { status: 409 });
      }
    }
  }

  const assignment =
    role.scope === "ORG" && organizationId
      ? await replaceOrgRole({
          userId,
          organizationId,
          roleCode,
          grantedById: auth.session!.userId,
        })
      : (await prisma.userRoleAssignment.findFirst({
          where: { userId, roleCode, organizationId: null },
        })) ??
        (await prisma.userRoleAssignment.create({
          data: {
            userId,
            roleCode,
            organizationId: null,
            grantedById: auth.session!.userId,
          },
        }));

  if (role.scope === "GLOBAL") {
    const current = parseGlobalRoles(user.rolesGlobal);
    if (!current.includes(roleCode)) {
      await prisma.userAccount.update({
        where: { id: userId },
        data: { rolesGlobal: [...current, roleCode].join(",") },
      });
    }
  }

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "ROLE_ASSIGN",
    entityType: "UserRoleAssignment",
    entityId: assignment.id,
    organizationId: organizationId ?? undefined,
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

  const targetOrg = before.organizationId
    ? await prisma.organization.findUnique({ where: { id: before.organizationId } })
    : null;
  const denied = orgRoleAllowed(auth.session!.user, targetOrg, before.roleCode, before.role.scope);
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });

  if (before.roleCode === "ARSO_ADMIN" && !isArsoAdmin(auth.session!.user)) {
    return NextResponse.json({ error: "Only ARSO_ADMIN may revoke ARSO_ADMIN" }, { status: 403 });
  }

  if (before.roleCode === "ARSO_ADMIN") {
    const adminCount = await prisma.userRoleAssignment.count({ where: { roleCode: "ARSO_ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Cannot revoke the last ARSO_ADMIN assignment" }, { status: 409 });
    }
  }

  if (before.organizationId && before.roleCode === "PRIMARY_ADMIN") {
    const mainAccounts = await prisma.organizationMembership.count({
      where: { organizationId: before.organizationId, role: "PRIMARY_ADMIN" },
    });
    if (mainAccounts <= 1) {
      return NextResponse.json({ error: "This organisation needs a main account" }, { status: 409 });
    }
  }

  await removeOrgRole(assignmentId);

  if (before.role.scope === "GLOBAL") {
    const current = parseGlobalRoles(before.user.rolesGlobal).filter((code) => code !== before.roleCode);
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
