import { prisma } from "@/lib/db";
import { parseGlobalRoles } from "@/lib/rbac";

/** One organisation role per person. Membership and the role assignment stay the same role. */
export async function replaceOrgRole(input: {
  userId: string;
  organizationId: string;
  roleCode: string;
  grantedById: string;
}) {
  await prisma.organizationMembership.upsert({
    where: { organizationId_userId: { organizationId: input.organizationId, userId: input.userId } },
    create: {
      organizationId: input.organizationId,
      userId: input.userId,
      role: input.roleCode,
    },
    update: { role: input.roleCode },
  });
  await prisma.userRoleAssignment.deleteMany({
    where: {
      userId: input.userId,
      organizationId: input.organizationId,
      role: { scope: "ORG" },
    },
  });
  return prisma.userRoleAssignment.create({
    data: {
      userId: input.userId,
      roleCode: input.roleCode,
      organizationId: input.organizationId,
      grantedById: input.grantedById,
    },
  });
}

/** Add a hub role. The person's organisation membership is left as it is. */
export async function grantGlobalRole(input: { userId: string; roleCode: string; grantedById: string }) {
  const existing = await prisma.userRoleAssignment.findFirst({
    where: { userId: input.userId, roleCode: input.roleCode, organizationId: null },
  });
  const assignment =
    existing ??
    (await prisma.userRoleAssignment.create({
      data: {
        userId: input.userId,
        roleCode: input.roleCode,
        organizationId: null,
        grantedById: input.grantedById,
      },
    }));
  const user = await prisma.userAccount.findUnique({ where: { id: input.userId }, select: { rolesGlobal: true } });
  const current = parseGlobalRoles(user?.rolesGlobal || "");
  if (!current.includes(input.roleCode)) {
    await prisma.userAccount.update({
      where: { id: input.userId },
      data: { rolesGlobal: [...current, input.roleCode].join(",") },
    });
  }
  return assignment;
}

export async function removeOrgRole(assignmentId: string) {
  const before = await prisma.userRoleAssignment.findUnique({
    where: { id: assignmentId },
    include: { role: true },
  });
  if (!before) return null;
  await prisma.userRoleAssignment.delete({ where: { id: assignmentId } });
  if (before.organizationId && before.role.scope === "ORG") {
    const remaining = await prisma.userRoleAssignment.findFirst({
      where: {
        userId: before.userId,
        organizationId: before.organizationId,
        role: { scope: "ORG" },
      },
    });
    if (remaining) {
      await prisma.organizationMembership.updateMany({
        where: { organizationId: before.organizationId, userId: before.userId },
        data: { role: remaining.roleCode },
      });
    } else {
      await prisma.organizationMembership.deleteMany({
        where: { organizationId: before.organizationId, userId: before.userId },
      });
    }
  }
  return before;
}
