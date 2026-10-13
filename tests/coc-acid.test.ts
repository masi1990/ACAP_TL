import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { issueCertificateOfConformity } from "../src/lib/coc";

const prisma = new PrismaClient();

describe("CoC ACID paths", () => {
  let applicationId = "";
  let itemId = "";
  let skipReason: string | null = null;
  const created = {
    orgId: "",
    accountId: "",
    companyId: "",
    productId: "",
    variantId: "",
    licenceIds: [] as string[],
  };

  beforeAll(async () => {
    const ver = await prisma.standardVersion.findFirst();
    const cb = await prisma.organization.findFirst({ where: { type: "CB" } });
    if (!ver || !cb) {
      skipReason = "Missing CB or standard version for CoC fixture";
      return;
    }
    const stamp = Date.now();
    for (const mark of ["QUALITY", "ECO"] as const) {
      const approved = await prisma.cbLicense.findFirst({
        where: { organizationId: cb.id, markScheme: mark, status: "APPROVED" },
      });
      if (approved) continue;
      const licence = await prisma.cbLicense.create({
        data: {
          organizationId: cb.id,
          licenseType: mark === "ECO" ? "TYPE1_ECO" : "TYPE1_QUALITY",
          markScheme: mark,
          status: "APPROVED",
          licenseNumber: `TEST-${mark}-${stamp}`,
        },
      });
      created.licenceIds.push(licence.id);
    }
    const org = await prisma.organization.create({
      data: { name: `Dossier test ${Date.now()}`, type: "MANUFACTURER" },
    });
    const account = await prisma.clientAccount.create({
      data: { organizationId: org.id, displayName: org.name },
    });
    const company = await prisma.company.create({
      data: { clientAccountId: account.id, legalName: org.name, countryIso2: "KE" },
    });
    const product = await prisma.product.create({
      data: { companyId: company.id, name: "Dossier test product", commodity: "test" },
    });
    const variant = await prisma.productVariant.create({
      data: { productId: product.id, sku: `SKU-${product.id.slice(-8)}`, label: product.name },
    });
    const application = await prisma.certificationApplication.create({
      data: {
        productId: product.id,
        organizationId: cb.id,
        standardVersionId: ver.id,
        status: "EVALUATION",
        markScheme: "ECO",
      },
    });
    const item = await prisma.assessmentItem.create({
      data: {
        applicationId: application.id,
        source: "STANDARD",
        kind: "table",
        itemKey: "table:moisture",
        heading: "Moisture",
        text: "10",
        testMethod: "ISO 1",
        pass: true,
      },
    });
    applicationId = application.id;
    itemId = item.id;
    created.orgId = org.id;
    created.accountId = account.id;
    created.companyId = company.id;
    created.productId = product.id;
    created.variantId = variant.id;
  });

  afterAll(async () => {
    if (applicationId) {
      const coc = await prisma.coC.findUnique({ where: { applicationId } });
      if (coc) {
        await prisma.notificationJob.deleteMany({ where: { cocId: coc.id } });
        await prisma.ledgerAnchor.deleteMany({ where: { cocId: coc.id } });
        await prisma.markGrant.deleteMany({ where: { cocId: coc.id } });
        await prisma.productPin.deleteMany({ where: { cocId: coc.id } });
        await prisma.coC.delete({ where: { id: coc.id } });
      }
      await prisma.labEvidence.deleteMany({ where: { assessmentItemId: itemId } });
      await prisma.assessmentItem.deleteMany({ where: { applicationId } });
      await prisma.testDossier.deleteMany({ where: { applicationId } });
      await prisma.dossierAttachment.deleteMany({ where: { applicationId } });
      await prisma.certificationApplication.delete({ where: { id: applicationId } });
      await prisma.productVariant.delete({ where: { id: created.variantId } });
      await prisma.product.delete({ where: { id: created.productId } });
      await prisma.company.delete({ where: { id: created.companyId } });
      await prisma.clientAccount.delete({ where: { id: created.accountId } });
      await prisma.organization.delete({ where: { id: created.orgId } });
    }
    if (created.licenceIds.length) {
      await prisma.cbLicense.deleteMany({ where: { id: { in: created.licenceIds } } });
    }
    await prisma.$disconnect();
  });

  it("refuses a certificate until the dossier and measured results are complete", async () => {
    if (skipReason) {
      console.warn(`skip: ${skipReason}`);
      return;
    }
    await expect(issueCertificateOfConformity({ applicationId })).rejects.toThrow(/Still needed/);
  });

  it("issues once when the dossier and table result are complete, even with no annexes", async () => {
    if (skipReason) {
      console.warn(`skip: ${skipReason}`);
      return;
    }
    await prisma.testDossier.create({
      data: {
        applicationId,
        laboratoryName: "Test Lab",
        reportNo: "R-1",
        sampleCode: "S-1",
        testedAt: new Date("2026-10-01T00:00:00.000Z"),
      },
    });
    await expect(issueCertificateOfConformity({ applicationId })).rejects.toThrow(/measured value/i);

    await prisma.assessmentItem.update({
      where: { id: itemId },
      data: { measuredValue: "9", unit: "%" },
    });
    await expect(issueCertificateOfConformity({ applicationId })).rejects.toThrow(/laboratory file/i);

    await prisma.labEvidence.create({
      data: {
        assessmentItemId: itemId,
        filename: "result.pdf",
        contentType: "application/pdf",
        storageUri: "test-result.pdf",
      },
    });

    const annexes = await prisma.dossierAttachment.count({ where: { applicationId } });
    expect(annexes).toBe(0);

    const key = `test-idem-${applicationId}`;
    const first = await issueCertificateOfConformity({ applicationId, idempotencyKey: key });
    expect(first.reused).toBe(false);
    expect(first.coc.certificateNo).toMatch(/^COC-/);

    const second = await issueCertificateOfConformity({ applicationId, idempotencyKey: key });
    expect(second.reused).toBe(true);
    expect(second.coc.id).toBe(first.coc.id);

    const pins = await prisma.productPin.count({ where: { cocId: first.coc.id } });
    expect(pins).toBeGreaterThan(0);
    const reminders = await prisma.notificationJob.count({
      where: { cocId: first.coc.id, kind: "EXPIRY_REMINDER" },
    });
    expect(reminders).toBe(5);
    const expired = await prisma.notificationJob.count({
      where: { cocId: first.coc.id, kind: "COC_EXPIRED" },
    });
    expect(expired).toBe(1);
    const anchors = await prisma.ledgerAnchor.count({
      where: { cocId: first.coc.id, eventType: "COC_ISSUED" },
    });
    expect(anchors).toBe(1);
  });
});
