/**
 * Role-based access with least privilege.
 * - RoleDefinition (DB) is the source of truth for permission sets.
 * - UserRoleAssignment binds users to roles (GLOBAL or ORG-scoped).
 * - UserAccount.rolesGlobal is kept as a legacy/cache of GLOBAL role codes.
 */

export const GLOBAL_ROLES = [
  "ARSO_ADMIN",
  "ARSO_SUPPORT",
  "ARSO_CATALOGUE_EDITOR",
  "ARSO_AUDITOR",
] as const;
export type GlobalRole = (typeof GLOBAL_ROLES)[number];

export const ORG_ROLES = [
  "PRIMARY_ADMIN",
  "ORG_ADMIN",
  "ORG_USER",
  "CB_OFFICER",
  "CUSTOMS_OFFICER",
  "INSPECTOR",
  "SURVEILLANCE_OFFICER",
] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const ORG_TYPES = [
  "ARSO",
  "CB",
  "MANUFACTURER",
  "IMPORTER",
  "CLIENT",
  "NSB",
  "CUSTOMS",
  "ENTRY_POINT_OP",
  "MARKET_SURVEILLANCE",
] as const;
export type OrgType = (typeof ORG_TYPES)[number];

/** Fine-grained permissions used by admin APIs and UI */
export type Permission =
  | "standards:read"
  | "standards:write"
  | "standards:delete"
  | "standards:import"
  | "standards:preview_full"
  | "recs:read"
  | "recs:write"
  | "recs:delete"
  | "tariffs:read"
  | "tariffs:write"
  | "tariffs:delete"
  | "cb:read"
  | "cb:write"
  | "cb:delete"
  | "manufacturer:read"
  | "manufacturer:write"
  | "manufacturer:delete"
  | "portal:operate"
  | "products:read"
  | "products:write"
  | "certify:operate"
  | "clients:write"
  | "customs:decide"
  | "inspect:write"
  | "surveillance:operate"
  | "impersonate"
  | "audit:read"
  | "roles:read"
  | "roles:write"
  | "roles:assign"
  | "users:read";

export const ALL_PERMISSIONS: Permission[] = [
  "standards:read",
  "standards:write",
  "standards:delete",
  "standards:import",
  "standards:preview_full",
  "recs:read",
  "recs:write",
  "recs:delete",
  "tariffs:read",
  "tariffs:write",
  "tariffs:delete",
  "cb:read",
  "cb:write",
  "cb:delete",
  "manufacturer:read",
  "manufacturer:write",
  "manufacturer:delete",
  "portal:operate",
  "products:read",
  "products:write",
  "certify:operate",
  "clients:write",
  "customs:decide",
  "inspect:write",
  "surveillance:operate",
  "impersonate",
  "audit:read",
  "roles:read",
  "roles:write",
  "roles:assign",
  "users:read",
];

/** Built-in least-privilege matrix (also seeded into RoleDefinition) */
export const SYSTEM_ROLE_DEFS: Array<{
  code: string;
  name: string;
  description: string;
  scope: "GLOBAL" | "ORG";
  permissions: Permission[];
}> = [
  {
    code: "ARSO_ADMIN",
    name: "ARSO Administrator",
    description: "Full hub administration. Use sparingly — breaks least privilege if over-assigned.",
    scope: "GLOBAL",
    permissions: [...ALL_PERMISSIONS],
  },
  {
    code: "ARSO_SUPPORT",
    name: "ARSO Support",
    description: "Operate and assist; no destructive deletes; can impersonate with reason.",
    scope: "GLOBAL",
    permissions: [
      "standards:read",
      "standards:write",
      "standards:import",
      "standards:preview_full",
      "recs:read",
      "recs:write",
      "tariffs:read",
      "tariffs:write",
      "cb:read",
      "cb:write",
      "manufacturer:read",
      "manufacturer:write",
      "products:read",
      "products:write",
      "clients:write",
      "certify:operate",
      "customs:decide",
      "inspect:write",
      "surveillance:operate",
      "portal:operate",
      "impersonate",
      "audit:read",
      "roles:read",
      "users:read",
    ],
  },
  {
    code: "ARSO_CATALOGUE_EDITOR",
    name: "Catalogue editor",
    description: "Maintain standards, RECs, and tariff maps only — no org or role admin.",
    scope: "GLOBAL",
    permissions: [
      "standards:read",
      "standards:write",
      "standards:import",
      "standards:preview_full",
      "recs:read",
      "recs:write",
      "tariffs:read",
      "tariffs:write",
      "audit:read",
    ],
  },
  {
    code: "ARSO_AUDITOR",
    name: "Auditor (read-only)",
    description: "Read catalogue, orgs, audit trail — no writes.",
    scope: "GLOBAL",
    permissions: [
      "standards:read",
      "standards:preview_full",
      "recs:read",
      "tariffs:read",
      "cb:read",
      "manufacturer:read",
      "products:read",
      "audit:read",
      "roles:read",
      "users:read",
    ],
  },
  {
    code: "PRIMARY_ADMIN",
    name: "Organisation primary admin",
    description: "Owns an organisation; scoped by membership org type.",
    scope: "ORG",
    permissions: ["portal:operate"],
  },
  {
    code: "ORG_ADMIN",
    name: "Organisation admin",
    description: "Administers org users and records within one organisation.",
    scope: "ORG",
    permissions: ["portal:operate"],
  },
  {
    code: "ORG_USER",
    name: "Organisation user",
    description: "Day-to-day org access without admin privileges.",
    scope: "ORG",
    permissions: ["portal:operate"],
  },
  {
    code: "CB_OFFICER",
    name: "CB officer",
    description:
      "Certification body officer. Registers client manufacturers and importers, the products certified for them, laboratory results against every requirement of the standard, and the certificate.",
    scope: "ORG",
    permissions: [
      "standards:read",
      "recs:read",
      "tariffs:read",
      "cb:read",
      "products:read",
      "products:write",
      "clients:write",
      "certify:operate",
      "portal:operate",
    ],
  },
  {
    code: "CUSTOMS_OFFICER",
    name: "Customs officer",
    description: "Decides whether a certified product may enter a destination country.",
    scope: "ORG",
    permissions: ["standards:read", "recs:read", "tariffs:read", "products:read", "customs:decide"],
  },
  {
    code: "INSPECTOR",
    name: "Conformity inspector",
    description: "Checks a product against its one linked standard.",
    scope: "ORG",
    permissions: ["standards:read", "products:read", "inspect:write"],
  },
  {
    code: "SURVEILLANCE_OFFICER",
    name: "Market surveillance officer",
    description: "Opens market surveillance cases on certified products.",
    scope: "ORG",
    permissions: ["standards:read", "products:read", "surveillance:operate"],
  },
];

type Membership = { role: string; organization: { id: string; type: string } };

export function parseGlobalRoles(rolesGlobal: string): string[] {
  return rolesGlobal
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
}

function orgTypePermissions(type: string, role: string): Permission[] {
  const perms: Permission[] = [];
  if (type === "CB" && ["PRIMARY_ADMIN", "ORG_ADMIN", "CB_OFFICER"].includes(role)) {
    perms.push(
      "standards:read",
      "recs:read",
      "tariffs:read",
      "cb:read",
      "products:read",
      "products:write",
      "clients:write",
      "certify:operate",
      "portal:operate",
    );
  }
  if (
    (type === "MANUFACTURER" || type === "IMPORTER" || type === "CLIENT") &&
    ["PRIMARY_ADMIN", "ORG_ADMIN", "ORG_USER"].includes(role)
  ) {
    perms.push("standards:read", "recs:read", "tariffs:read", "manufacturer:read", "products:read", "products:write");
    if (role === "PRIMARY_ADMIN" || role === "ORG_ADMIN") perms.push("manufacturer:write");
  }
  if (type === "CUSTOMS" && ["CUSTOMS_OFFICER", "ORG_ADMIN", "PRIMARY_ADMIN"].includes(role)) {
    perms.push("standards:read", "recs:read", "tariffs:read", "products:read", "customs:decide");
  }
  if (type === "NSB" && ["INSPECTOR", "ORG_ADMIN", "PRIMARY_ADMIN", "ORG_USER"].includes(role)) {
    perms.push("standards:read", "products:read", "inspect:write");
  }
  if (
    type === "MARKET_SURVEILLANCE" &&
    ["SURVEILLANCE_OFFICER", "ORG_ADMIN", "PRIMARY_ADMIN", "ORG_USER"].includes(role)
  ) {
    perms.push("standards:read", "products:read", "surveillance:operate");
  }
  if (type === "ARSO" && ["PRIMARY_ADMIN", "ORG_ADMIN"].includes(role)) {
    // membership in ARSO org alone does not grant hub admin — need GLOBAL role
    perms.push("portal:operate");
  }
  return perms;
}

/**
 * Resolve permissions from:
 * 1) explicit RoleDefinition maps (if provided)
 * 2) built-in SYSTEM_ROLE_DEFS for known codes
 * 3) org membership type × role
 */
export function permissionsForUser(
  user: {
    rolesGlobal: string;
    memberships: Membership[];
    roleAssignments?: Array<{ roleCode: string; role?: { permissionsJson?: string; scope?: string } }>;
  },
  rolePermissionMap?: Map<string, Permission[]>,
): Set<Permission> {
  const perms = new Set<Permission>();

  const addFromCode = (code: string) => {
    if (rolePermissionMap?.has(code)) {
      for (const p of rolePermissionMap.get(code)!) perms.add(p);
      return;
    }
    const builtIn = SYSTEM_ROLE_DEFS.find((r) => r.code === code);
    if (builtIn) for (const p of builtIn.permissions) perms.add(p);
  };

  for (const code of parseGlobalRoles(user.rolesGlobal)) addFromCode(code);

  if (user.roleAssignments?.length) {
    for (const a of user.roleAssignments) {
      if (a.role?.permissionsJson) {
        try {
          const list = JSON.parse(a.role.permissionsJson) as string[];
          for (const p of list) perms.add(p as Permission);
        } catch {
          addFromCode(a.roleCode);
        }
      } else {
        addFromCode(a.roleCode);
      }
    }
  }

  for (const m of user.memberships) {
    for (const p of orgTypePermissions(m.organization.type, m.role)) perms.add(p);
    // ORG-scoped RoleDefinition codes on membership.role
    addFromCode(m.role);
  }

  return perms;
}

export function can(
  user: {
    rolesGlobal: string;
    memberships: Membership[];
    roleAssignments?: Array<{ roleCode: string; role?: { permissionsJson?: string; scope?: string } }>;
  },
  permission: Permission,
  rolePermissionMap?: Map<string, Permission[]>,
) {
  return permissionsForUser(user, rolePermissionMap).has(permission);
}

export function isArsoAdmin(user: { rolesGlobal: string }) {
  return parseGlobalRoles(user.rolesGlobal).includes("ARSO_ADMIN");
}

export function isTradeOrgType(type: string) {
  return type === "MANUFACTURER" || type === "IMPORTER" || type === "CLIENT";
}

/** Routes that remain public (no session). Everything else under /[locale]/… requires auth. */
export const PUBLIC_PATH_SUFFIXES = [
  "",
  "/lookup",
  "/verify",
  "/store",
  "/store/return",
  "/registry",
  "/login",
  "/consumers",
] as const;
