import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/audit";
import { grantOrgRole } from "@/lib/org-accounts";
import { ensureSystemRoles } from "@/lib/system-roles";
import { notifyAfterCommit, queueLibraryRelease, queueLibraryRoleAssigned } from "@/lib/notifications";
import { isCountryCode } from "@/lib/countries";

export type LibraryOrg = {
  id: string;
  name: string;
  type: string;
  status: string;
  backing: string;
  alsoCertifies: boolean;
  memberStateId: string | null;
  operatingCountries: { memberStateId: string }[];
};

/** An active national standards body, government certification body, or private certification body. */
export function isLibraryInstitution(org: {
  type: string;
  status: string;
  backing: string;
  memberStateId: string | null;
  operatingCountries: { memberStateId: string }[];
}) {
  if (org.status !== "ACTIVE") return false;
  if (org.type === "NSB") return Boolean(org.memberStateId);
  if (org.type !== "CB") return false;
  if (org.backing === "PRIVATE") return org.operatingCountries.length > 0;
  return Boolean(org.memberStateId);
}

export function countryAllowed(
  org: { type: string; backing: string; memberStateId: string | null; operatingCountries: { memberStateId: string }[] },
  memberStateId: string,
) {
  if (org.type === "CB" && org.backing === "PRIVATE") {
    return org.operatingCountries.some((row) => row.memberStateId === memberStateId);
  }
  return org.memberStateId === memberStateId;
}

export async function loadLibraryInstitutions() {
  const rows = await prisma.organization.findMany({
    where: { status: "ACTIVE", type: { in: ["NSB", "CB"] } },
    include: {
      memberState: true,
      operatingCountries: { include: { memberState: true } },
    },
    orderBy: { name: "asc" },
  });
  return rows.filter((org) => isLibraryInstitution(org));
}

export async function logLibraryActivity(input: {
  userId?: string | null;
  roleCode?: string;
  organizationId?: string | null;
  memberStateId?: string | null;
  postingId?: string | null;
  action: string;
  standardId?: string | null;
  language?: string;
  detail?: string;
}) {
  await prisma.libraryActivity.create({
    data: {
      userId: input.userId || null,
      roleCode: input.roleCode || "LIBRARY_OFFICER",
      organizationId: input.organizationId || null,
      memberStateId: input.memberStateId || null,
      postingId: input.postingId || null,
      action: input.action,
      standardId: input.standardId || null,
      language: input.language || "",
      detail: input.detail || "",
    },
  });
  if (input.userId) {
    await prisma.userAccount.update({
      where: { id: input.userId },
      data: { lastActiveAt: new Date() },
    });
  }
}

export async function latestPostingId(userId: string, organizationId: string) {
  const posting = await prisma.staffPosting.findFirst({
    where: { userId, organizationId },
    orderBy: { createdAt: "desc" },
  });
  return posting?.id ?? null;
}

/** Give the standards-officer role and full library access without removing other roles. */
export async function appointStandardsOfficer(input: {
  userId: string;
  organizationId: string;
  memberStateId: string;
  grantedById: string;
  scope?: "FULL" | "RELEASE";
}) {
  await ensureSystemRoles();
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    include: { operatingCountries: true },
  });
  if (!org || !isLibraryInstitution(org)) throw new Error("Choose an active standards body or certification body");
  if (!countryAllowed(org, input.memberStateId)) throw new Error("Choose a country this institution covers");

  await grantOrgRole({
    userId: input.userId,
    organizationId: org.id,
    roleCode: "LIBRARY_OFFICER",
    grantedById: input.grantedById,
  });
  const scope = input.scope || "FULL";
  const existingAccess = await prisma.libraryAccess.findUnique({
    where: {
      userId_organizationId_memberStateId: {
        userId: input.userId,
        organizationId: org.id,
        memberStateId: input.memberStateId,
      },
    },
  });
  const nextScope = existingAccess?.scope === "FULL" || scope === "FULL" ? "FULL" : "RELEASE";
  if (!existingAccess) {
    await prisma.libraryAccess.create({
      data: {
        userId: input.userId,
        organizationId: org.id,
        memberStateId: input.memberStateId,
        scope: nextScope,
        grantedById: input.grantedById,
      },
    });
  } else if (existingAccess.scope !== nextScope) {
    await prisma.libraryAccess.update({
      where: { id: existingAccess.id },
      data: { scope: nextScope, grantedById: input.grantedById, grantedAt: new Date() },
    });
  }
  return org;
}

export async function notifyStandardsOfficer(user: { id: string; email: string; name: string }, organizationName: string) {
  await queueLibraryRoleAssigned({
    userId: user.id,
    email: user.email,
    name: user.name,
    organizationName,
  });
  await notifyAfterCommit();
}

export async function userLibraryView(userId: string) {
  const access = await prisma.libraryAccess.findMany({
    where: { userId, organization: { status: "ACTIVE" } },
    include: { organization: true, memberState: true },
  });
  const full = access.some((row) => row.scope === "FULL");
  const releases = await prisma.libraryRelease.findMany({
    where: { userId },
    include: { items: { include: { standard: true } } },
  });
  const releasedIds = [...new Set(releases.flatMap((release) => release.items.map((item) => item.standardId)))];
  return { access, full, releasedIds };
}

export async function canDownloadStandard(userId: string, standardId: string) {
  const view = await userLibraryView(userId);
  if (!view.access.length) return null;
  if (view.full || view.releasedIds.includes(standardId)) return view.access[0];
  return null;
}

export async function createStaffPosting(input: {
  userId: string;
  organizationId: string;
  kind: string;
  officeName?: string;
  entryPointId?: string | null;
  countryIso2: string;
}) {
  const kind = input.kind.toUpperCase();
  if (!["REGIONAL", "BORDER", "FOREIGN"].includes(kind)) throw new Error("Choose a duty station");
  const countryIso2 = input.countryIso2.trim().toUpperCase();
  if (!isCountryCode(countryIso2)) throw new Error("Choose the country of the post");
  let entryPointId: string | null = null;
  if (kind === "BORDER") {
    const point = input.entryPointId
      ? await prisma.entryPoint.findFirst({
          where: { id: input.entryPointId, organizationId: input.organizationId },
        })
      : null;
    if (!point) throw new Error("Choose a border point of this institution");
    entryPointId = point.id;
  }
  if (kind === "REGIONAL" && !String(input.officeName || "").trim()) {
    throw new Error("Name the regional office");
  }
  return prisma.staffPosting.create({
    data: {
      userId: input.userId,
      organizationId: input.organizationId,
      kind,
      officeName: String(input.officeName || "").trim(),
      entryPointId,
      countryIso2,
    },
  });
}

export async function sendStandardRelease(input: {
  email: string;
  name: string;
  organizationId: string;
  memberStateId: string;
  standardIds: string[];
  requestId?: string | null;
  actorUserId: string;
}) {
  const email = input.email.toLowerCase().trim();
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    include: { operatingCountries: true, memberState: true },
  });
  if (!org || !isLibraryInstitution(org)) throw new Error("Choose an active standards body or certification body");
  if (!countryAllowed(org, input.memberStateId)) throw new Error("Choose a country this institution covers");
  const ids = [...new Set(input.standardIds.map((id) => id.trim()).filter(Boolean))];
  if (!ids.length) throw new Error("Select at least one standard");
  const standards = await prisma.standard.findMany({
    where: { id: { in: ids }, versions: { some: { publicationStatus: "PUBLISHED" } } },
    select: { id: true, designation: true },
  });
  if (standards.length !== ids.length) throw new Error("Choose published standards");

  const existing = await prisma.userAccount.findUnique({ where: { email } });
  const token = randomBytes(24).toString("hex");
  const release = await prisma.libraryRelease.create({
    data: {
      email,
      token,
      organizationId: org.id,
      memberStateId: input.memberStateId,
      userId: existing?.id ?? null,
      requestId: input.requestId || null,
      items: { create: standards.map((standard) => ({ standardId: standard.id })) },
    },
  });
  if (existing) {
    await appointStandardsOfficer({
      userId: existing.id,
      organizationId: org.id,
      memberStateId: input.memberStateId,
      grantedById: input.actorUserId,
      scope: "RELEASE",
    });
    const full = await prisma.libraryAccess.findFirst({
      where: { userId: existing.id, organizationId: org.id, memberStateId: input.memberStateId, scope: "FULL" },
    });
    if (full) {
      await prisma.libraryAccess.update({ where: { id: full.id }, data: { scope: "FULL" } });
    }
  }
  await queueLibraryRelease({
    releaseId: release.id,
    email,
    name: input.name || existing?.name || email,
    token,
    hasAccount: Boolean(existing),
    titles: standards.map((standard) => standard.designation),
  });
  await notifyAfterCommit();
  await logLibraryActivity({
    userId: input.actorUserId,
    roleCode: "ARSO_ADMIN",
    organizationId: org.id,
    memberStateId: input.memberStateId,
    action: "RELEASE_SENT",
    detail: email,
  });
  await appendAuditEvent({
    actorUserId: input.actorUserId,
    action: "LIBRARY_RELEASE",
    entityType: "LibraryRelease",
    entityId: release.id,
    organizationId: org.id,
    after: { email, standards: standards.map((standard) => standard.designation) },
  });
  return release;
}
