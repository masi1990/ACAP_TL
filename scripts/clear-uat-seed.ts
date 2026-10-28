/**
 * Clear end-to-end test rows from the hub database.
 * Keeps copied marks, portal decisions, and the Pesapal notification registration.
 * Keeps sign-in accounts, roles, member states, RECs, and the ARSO organisation.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const before = {
    marks: await prisma.importedCertifiedMark.count(),
    pesapal: await prisma.pesapalNotification.count(),
    users: await prisma.userAccount.count(),
  };

  await prisma.importedCertifiedMark.updateMany({
    data: { standardVersionId: null, manufacturerOrgId: null, certificationBodyOrgId: null },
  });

  await prisma.libraryActivity.deleteMany();
  await prisma.staffPosting.deleteMany();
  await prisma.libraryReleaseItem.deleteMany();
  await prisma.libraryRelease.deleteMany();
  await prisma.libraryStandardRequestItem.deleteMany();
  await prisma.libraryStandardRequest.deleteMany();
  await prisma.libraryAccessRequest.deleteMany();
  await prisma.libraryAccess.deleteMany();

  await prisma.labEvidence.deleteMany();
  await prisma.assessmentItem.deleteMany();
  await prisma.dossierAttachment.deleteMany();
  await prisma.testDossier.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.notificationJob.deleteMany();
  await prisma.feeEvent.deleteMany();
  await prisma.ledgerAnchor.deleteMany();
  await prisma.markGrant.deleteMany();
  await prisma.customsClearance.deleteMany();
  await prisma.conformityInspection.deleteMany();
  await prisma.fraudAlert.deleteMany();
  await prisma.consumerComplaint.deleteMany();
  await prisma.sanction.deleteMany();
  await prisma.surveillanceCase.deleteMany();
  await prisma.productPin.deleteMany();
  await prisma.coC.deleteMany();
  await prisma.certificationApplication.deleteMany();
  await prisma.productStandardLink.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.company.deleteMany();
  await prisma.clientAccount.deleteMany();
  await prisma.markSublicense.deleteMany();
  await prisma.cbLicense.deleteMany();
  await prisma.standardEntitlement.deleteMany();
  await prisma.paymentAttempt.deleteMany();
  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.catalogItem.deleteMany();
  await prisma.standardLanguageFile.deleteMany();
  await prisma.standardTariffMap.deleteMany();
  await prisma.nationalRuleLink.deleteMany();
  await prisma.nationalRule.deleteMany();
  await prisma.standardAdoption.deleteMany();
  await prisma.standardVersion.deleteMany();
  await prisma.standard.deleteMany();
  await prisma.technicalCommittee.deleteMany();
  await prisma.sector.deleteMany();
  await prisma.tariffLine.deleteMany();
  await prisma.webhookOutbox.deleteMany();
  await prisma.offlineCacheProfile.deleteMany();
  await prisma.portfolioTransfer.deleteMany();
  await prisma.institutionRequest.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.entryPoint.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.metricSnapshot.deleteMany();
  await prisma.rateLimitBucket.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.session.deleteMany();

  await prisma.organization.updateMany({ data: { servicingCbId: null } });
  await prisma.userRoleAssignment.deleteMany({ where: { organizationId: { not: null } } });
  await prisma.organizationMembership.deleteMany({ where: { organization: { type: { not: "ARSO" } } } });
  await prisma.organization.deleteMany({ where: { type: { not: "ARSO" } } });

  const after = {
    marks: await prisma.importedCertifiedMark.count(),
    pesapal: await prisma.pesapalNotification.count(),
    users: await prisma.userAccount.count(),
    standards: await prisma.standard.count(),
    products: await prisma.product.count(),
    orders: await prisma.order.count(),
  };
  console.log(JSON.stringify({ before, after }));
  if (after.marks !== before.marks || after.pesapal !== before.pesapal) {
    throw new Error("Copied marks or the payment-gateway registration changed");
  }
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : "Clear failed");
  await prisma.$disconnect();
  process.exit(1);
});
