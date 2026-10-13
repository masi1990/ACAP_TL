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
  "ORG_VIEWER",
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
  "REGULATOR",
  "CUSTOMS",
  "ENTRY_POINT_OP",
  "MARKET_SURVEILLANCE",
] as const;

/** Public authorities. Each one is its own organisation, even inside the same country. */
export const AUTHORITY_TYPES = [
  "CB",
  "NSB",
  "REGULATOR",
  "CUSTOMS",
  "MARKET_SURVEILLANCE",
  "ENTRY_POINT_OP",
] as const;

export const AUTHORITY_LABELS: Record<(typeof AUTHORITY_TYPES)[number], string> = {
  CB: "Certification body",
  NSB: "National standards body",
  REGULATOR: "Regulatory body",
  CUSTOMS: "Customs",
  MARKET_SURVEILLANCE: "Market surveillance",
  ENTRY_POINT_OP: "Border, port, or airport operator",
};

export function isAuthorityType(type: string) {
  return (AUTHORITY_TYPES as readonly string[]).includes(type);
}

type AuthorityMembership = {
  role: string;
  organization: { id: string; type: string; memberStateId?: string | null };
};

/** Member states where this person is the main account of a public authority. */
export function authorityOwnerStateIds(user: { memberships?: AuthorityMembership[] }) {
  const ids = new Set<string>();
  for (const membership of user.memberships ?? []) {
    if (membership.role !== "PRIMARY_ADMIN") continue;
    if (!isAuthorityType(membership.organization.type)) continue;
    if (membership.organization.memberStateId) ids.add(membership.organization.memberStateId);
  }
  return [...ids];
}

/** Roles a main account may give to other people in that organisation. */
export function assignableOrgRoles(type: string) {
  const operational =
    type === "CB"
      ? ["CB_OFFICER"]
      : type === "CUSTOMS" || type === "ENTRY_POINT_OP"
        ? ["CUSTOMS_OFFICER"]
        : type === "NSB" || type === "REGULATOR"
          ? ["INSPECTOR"]
          : type === "MARKET_SURVEILLANCE"
            ? ["SURVEILLANCE_OFFICER"]
            : [];
  return [...operational, "ORG_ADMIN", "ORG_USER", "ORG_VIEWER"];
}
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
  | "users:read"
  | "institutions:read"
  | "institutions:write"
  | "institutions:delete";

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
  "institutions:read",
  "institutions:write",
  "institutions:delete",
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
      "institutions:read",
      "institutions:write",
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
      "institutions:read",
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
    code: "ORG_VIEWER",
    name: "View only",
    description: "Can see this organisation's records. Cannot create, update, or delete.",
    scope: "ORG",
    permissions: ["standards:read", "recs:read", "tariffs:read", "products:read", "portal:operate"],
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

type RoleCarrier = {
  rolesGlobal: string;
  memberships?: Membership[];
  roleAssignments?: Array<{ roleCode: string; role?: { permissionsJson?: string; scope?: string } }>;
};

export function parseGlobalRoles(rolesGlobal: string): string[] {
  return rolesGlobal
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
}

function permissionsFromJson(json: string | undefined): Permission[] | null {
  if (!json) return null;
  try {
    const list = JSON.parse(json) as unknown;
    if (!Array.isArray(list)) return null;
    const allowed = new Set<string>(ALL_PERMISSIONS);
    return list.filter((item): item is Permission => typeof item === "string" && allowed.has(item));
  } catch {
    return null;
  }
}

/** Saved RoleDefinition permissions for each assigned code. Missing codes are absent from the map. */
function savedRolePermissions(user: RoleCarrier): Map<string, Permission[]> {
  const saved = new Map<string, Permission[]>();
  for (const assignment of user.roleAssignments ?? []) {
    const parsed = permissionsFromJson(assignment.role?.permissionsJson);
    if (parsed) saved.set(assignment.roleCode, parsed);
  }
  return saved;
}

function addRolePermissions(
  perms: Set<Permission>,
  code: string,
  saved: Map<string, Permission[]>,
  rolePermissionMap?: Map<string, Permission[]>,
) {
  if (saved.has(code)) {
    for (const permission of saved.get(code)!) perms.add(permission);
    return;
  }
  if (rolePermissionMap?.has(code)) {
    for (const permission of rolePermissionMap.get(code)!) perms.add(permission);
    return;
  }
  const builtIn = SYSTEM_ROLE_DEFS.find((role) => role.code === code);
  if (builtIn) for (const permission of builtIn.permissions) perms.add(permission);
}

/**
 * Permissions that come from assigned roles only.
 * A saved RoleDefinition replaces the built-in matrix for that code.
 * Organisation membership does not add anything here.
 */
export function permissionsFromAssignedRoles(
  user: RoleCarrier,
  rolePermissionMap?: Map<string, Permission[]>,
): Set<Permission> {
  const perms = new Set<Permission>();
  const saved = savedRolePermissions(user);
  const seen = new Set<string>();
  for (const code of parseGlobalRoles(user.rolesGlobal)) {
    seen.add(code);
    addRolePermissions(perms, code, saved, rolePermissionMap);
  }
  for (const assignment of user.roleAssignments ?? []) {
    if (seen.has(assignment.roleCode)) continue;
    seen.add(assignment.roleCode);
    addRolePermissions(perms, assignment.roleCode, saved, rolePermissionMap);
  }
  return perms;
}

function orgTypePermissions(type: string, role: string): Permission[] {
  if (role === "ORG_VIEWER") {
    return ["standards:read", "recs:read", "tariffs:read", "products:read", "portal:operate"];
  }
  const perms: Permission[] = [];
  if (role === "PRIMARY_ADMIN") perms.push("roles:assign");
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
  if (
    (type === "CUSTOMS" || type === "ENTRY_POINT_OP") &&
    ["CUSTOMS_OFFICER", "ORG_ADMIN", "PRIMARY_ADMIN"].includes(role)
  ) {
    perms.push("standards:read", "recs:read", "tariffs:read", "products:read", "customs:decide");
  }
  if (
    (type === "NSB" || type === "REGULATOR") &&
    ["INSPECTOR", "ORG_ADMIN", "PRIMARY_ADMIN", "ORG_USER"].includes(role)
  ) {
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
 * 1) saved RoleDefinition.permissionsJson on each assignment
 * 2) SYSTEM_ROLE_DEFS only when that code has no saved row
 * 3) organisation membership type × role (desk actions for that organisation)
 */
export function permissionsForUser(
  user: RoleCarrier & { memberships: Membership[] },
  rolePermissionMap?: Map<string, Permission[]>,
): Set<Permission> {
  const perms = permissionsFromAssignedRoles(user, rolePermissionMap);
  const saved = savedRolePermissions(user);
  for (const membership of user.memberships) {
    for (const permission of orgTypePermissions(membership.organization.type, membership.role)) {
      perms.add(permission);
    }
    addRolePermissions(perms, membership.role, saved, rolePermissionMap);
  }
  return perms;
}

export function can(
  user: RoleCarrier & { memberships: Membership[] },
  permission: Permission,
  rolePermissionMap?: Map<string, Permission[]>,
) {
  return permissionsForUser(user, rolePermissionMap).has(permission);
}

export function isArsoAdmin(user: { rolesGlobal: string; roleAssignments?: Array<{ roleCode: string }> }) {
  if (parseGlobalRoles(user.rolesGlobal).includes("ARSO_ADMIN")) return true;
  return user.roleAssignments?.some((assignment) => assignment.roleCode === "ARSO_ADMIN") ?? false;
}

/** Hub-level role assignment, taken from a saved role rather than an organisation membership. */
export function canAssignAcrossOrganisations(user: RoleCarrier) {
  return isArsoAdmin(user) || permissionsFromAssignedRoles(user).has("roles:assign");
}

export function isTradeOrgType(type: string) {
  return type === "MANUFACTURER" || type === "IMPORTER" || type === "CLIENT";
}

export const ORG_ROLE_LABELS: Record<string, string> = {
  PRIMARY_ADMIN: "Organisation primary admin",
  ORG_ADMIN: "Organisation admin",
  ORG_USER: "Organisation user",
  ORG_VIEWER: "View only",
  CB_OFFICER: "CB officer",
  CUSTOMS_OFFICER: "Customs officer",
  INSPECTOR: "Conformity inspector",
  SURVEILLANCE_OFFICER: "Market surveillance officer",
};

/** Prefer the saved catalogue name, then the built-in system name. */
export function roleLabel(code: string, savedName?: string | null) {
  const saved = savedName?.trim();
  if (saved) return saved;
  return SYSTEM_ROLE_DEFS.find((role) => role.code === code)?.name || ORG_ROLE_LABELS[code] || code;
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
