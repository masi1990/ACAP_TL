import { prisma } from "./db";
import { SYSTEM_ROLE_DEFS } from "./rbac";

/** Insert system roles that are not in the catalogue yet. Existing rows keep their saved permissions. */
export async function ensureSystemRoles() {
  const existing = await prisma.roleDefinition.findMany({
    where: { code: { in: SYSTEM_ROLE_DEFS.map((def) => def.code) } },
    select: { code: true },
  });
  const have = new Set(existing.map((role) => role.code));
  for (const def of SYSTEM_ROLE_DEFS) {
    if (have.has(def.code)) continue;
    await prisma.roleDefinition.create({
      data: {
        id: `role-${def.code.toLowerCase()}`,
        code: def.code,
        name: def.name,
        description: def.description,
        scope: def.scope,
        permissionsJson: JSON.stringify(def.permissions),
        isSystem: true,
      },
    });
  }
}
