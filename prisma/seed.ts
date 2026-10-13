/**
 * Bootstrap seed — roles, logins, member states, and reference RECs.
 * No demo agencies, standards, tariffs, or products.
 *
 * Prefer `prisma db push --force-reset` then this seed (tables already empty).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { countryByIso2 } from "../src/lib/africa-regions";
import { MEMBER_STATES, memberStateId } from "../src/lib/member-states";
import { REFERENCE_RECS } from "../src/lib/rec-memberships";
import { SYSTEM_ROLE_DEFS } from "../src/lib/rbac";

const prisma = new PrismaClient();

async function main() {
  // Clear in dependency-safe order when re-seeding without force-reset
  await prisma.$transaction([
    prisma.fraudAlert.deleteMany(),
    prisma.consumerComplaint.deleteMany(),
    prisma.sanction.deleteMany(),
    prisma.surveillanceCase.deleteMany(),
    prisma.offlineCacheProfile.deleteMany(),
    prisma.webhookOutbox.deleteMany(),
    prisma.standardEntitlement.deleteMany(),
    prisma.paymentAttempt.deleteMany(),
    prisma.orderLine.deleteMany(),
    prisma.order.deleteMany(),
    prisma.notificationJob.deleteMany(),
    prisma.feeEvent.deleteMany(),
    prisma.ledgerAnchor.deleteMany(),
    prisma.markGrant.deleteMany(),
    prisma.customsClearance.deleteMany(),
    prisma.conformityInspection.deleteMany(),
    prisma.productPin.deleteMany(),
    prisma.coC.deleteMany(),
    prisma.labEvidence.deleteMany(),
    prisma.dossierAttachment.deleteMany(),
    prisma.testDossier.deleteMany(),
    prisma.assessmentItem.deleteMany(),
    prisma.labResult.deleteMany(),
    prisma.attachment.deleteMany(),
    prisma.certificationApplication.deleteMany(),
    prisma.productStandardLink.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.company.deleteMany(),
    prisma.clientAccount.deleteMany(),
    prisma.markSublicense.deleteMany(),
    prisma.cbLicense.deleteMany(),
    prisma.catalogItem.deleteMany(),
    prisma.nationalRuleLink.deleteMany(),
    prisma.nationalRule.deleteMany(),
    prisma.standardTariffMap.deleteMany(),
    prisma.standardVersion.deleteMany(),
    prisma.standard.deleteMany(),
    prisma.tariffLine.deleteMany(),
    prisma.memberStateRec.deleteMany(),
    prisma.rec.deleteMany(),
    prisma.invitation.deleteMany(),
    prisma.session.deleteMany(),
    prisma.userRoleAssignment.deleteMany(),
    prisma.organizationMembership.deleteMany(),
    prisma.entryPoint.deleteMany(),
    prisma.organization.deleteMany(),
    prisma.userAccount.deleteMany(),
    prisma.roleDefinition.deleteMany(),
    prisma.memberState.deleteMany(),
    prisma.auditEvent.deleteMany(),
    prisma.metricSnapshot.deleteMany(),
    prisma.rateLimitBucket.deleteMany(),
    prisma.portfolioTransfer.deleteMany(),
  ]);

  // System role catalogue (least-privilege matrix)
  for (const def of SYSTEM_ROLE_DEFS) {
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

  const passwordHash = await bcrypt.hash("ChangeMe!ACAP", 10);

  const arsoAdmin = await prisma.userAccount.create({
    data: {
      email: "admin@arso-oran.org",
      name: "ARSO Hub Admin",
      passwordHash,
      emailVerified: true,
      rolesGlobal: "ARSO_ADMIN",
      locale: "en",
    },
  });

  const support = await prisma.userAccount.create({
    data: {
      email: "support@arso-oran.org",
      name: "ARSO Support",
      passwordHash,
      emailVerified: true,
      rolesGlobal: "ARSO_SUPPORT",
      locale: "en",
    },
  });

  const catalogueEditor = await prisma.userAccount.create({
    data: {
      email: "catalogue@arso-oran.org",
      name: "Catalogue Editor",
      passwordHash,
      emailVerified: true,
      rolesGlobal: "ARSO_CATALOGUE_EDITOR",
      locale: "en",
    },
  });

  const auditor = await prisma.userAccount.create({
    data: {
      email: "auditor@arso-oran.org",
      name: "ARSO Auditor",
      passwordHash,
      emailVerified: true,
      rolesGlobal: "ARSO_AUDITOR",
      locale: "en",
    },
  });

  const arsoOrg = await prisma.organization.create({
    data: {
      id: "org-arso",
      name: "African Organisation for Standardisation (ARSO)",
      type: "ARSO",
      primaryAdminId: arsoAdmin.id,
    },
  });

  await prisma.organizationMembership.create({
    data: {
      organizationId: arsoOrg.id,
      userId: arsoAdmin.id,
      role: "PRIMARY_ADMIN",
    },
  });
  await prisma.organizationMembership.create({
    data: {
      organizationId: arsoOrg.id,
      userId: support.id,
      role: "ORG_USER",
    },
  });

  // Canonical UserRoleAssignment rows (kept in sync with rolesGlobal for GLOBAL roles)
  const globalAssignments: Array<{ userId: string; roleCode: string }> = [
    { userId: arsoAdmin.id, roleCode: "ARSO_ADMIN" },
    { userId: support.id, roleCode: "ARSO_SUPPORT" },
    { userId: catalogueEditor.id, roleCode: "ARSO_CATALOGUE_EDITOR" },
    { userId: auditor.id, roleCode: "ARSO_AUDITOR" },
  ];
  for (const a of globalAssignments) {
    await prisma.userRoleAssignment.create({
      data: {
        id: `ura-${a.roleCode.toLowerCase()}`,
        userId: a.userId,
        roleCode: a.roleCode,
        organizationId: null,
        grantedById: arsoAdmin.id,
      },
    });
  }

  await prisma.memberState.createMany({
    data: MEMBER_STATES.map((state) => ({
      id: memberStateId(state.iso2),
      iso2: state.iso2,
      name: state.name,
      region: countryByIso2(state.iso2)?.region || "",
    })),
  });

  for (const rec of REFERENCE_RECS) {
    const row = await prisma.rec.create({
      data: {
        id: `rec-${rec.code.toLowerCase()}`,
        code: rec.code,
        name: rec.name,
      },
    });
    await prisma.memberStateRec.createMany({
      data: rec.iso2.map((iso2) => ({
        memberStateId: memberStateId(iso2),
        recId: row.id,
      })),
    });
  }

  console.log("Bootstrap seed complete (no demo agencies or catalogue products).");
  console.log(`Seeded ${SYSTEM_ROLE_DEFS.length} system RoleDefinitions.`);
  console.log("Logins (password: ChangeMe!ACAP):");
  console.log("  admin@arso-oran.org       — ARSO_ADMIN (full CRUD + roles)");
  console.log("  support@arso-oran.org     — ARSO_SUPPORT (no deletes / no role write)");
  console.log("  catalogue@arso-oran.org   — ARSO_CATALOGUE_EDITOR (standards/RECs/tariffs)");
  console.log("  auditor@arso-oran.org     — ARSO_AUDITOR (read-only + full preview)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
