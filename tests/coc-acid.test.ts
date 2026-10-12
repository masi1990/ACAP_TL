import { beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { issueCertificateOfConformity } from "../src/lib/coc";

const prisma = new PrismaClient();

describe("CoC ACID paths", () => {
  let applicationId: string;

  let skipReason: string | null = null;

  beforeAll(async () => {
    const app = await prisma.certificationApplication.findFirst({
      where: { coc: null },
      orderBy: { createdAt: "desc" },
    });
    if (!app) {
      // Bootstrap seed has no certification demo data — skip ACID path unless catalogue was loaded
      const product = await prisma.product.findFirst({ include: { variants: true } });
      if (!product) {
        skipReason = "No certification fixtures (bootstrap seed is catalogue-empty by design)";
        return;
      }
      const ver = await prisma.standardVersion.findFirst();
      const cb = await prisma.organization.findFirst({ where: { type: "CB" } });
      if (!ver || !cb) {
        skipReason = "Missing CB or standard version for CoC fixture";
        return;
      }
      const created = await prisma.certificationApplication.create({
        data: {
          productId: product.id,
          organizationId: cb.id,
          standardVersionId: ver.id,
          status: "EVALUATION",
          markScheme: "ECO",
        },
      });
      applicationId = created.id;
    } else {
      applicationId = app.id;
    }
  });

  it("issues a CoC once and returns idempotent reuse on retry", async () => {
    if (skipReason) {
      console.warn(`skip: ${skipReason}`);
      return;
    }
    const key = `test-idem-${applicationId}`;
    const first = await issueCertificateOfConformity({
      applicationId,
      idempotencyKey: key,
    });
    expect(first.reused).toBe(false);
    expect(first.coc.certificateNo).toMatch(/^COC-/);

    const second = await issueCertificateOfConformity({
      applicationId,
      idempotencyKey: key,
    });
    expect(second.reused).toBe(true);
    expect(second.coc.id).toBe(first.coc.id);

    const pins = await prisma.productPin.count({ where: { cocId: first.coc.id } });
    expect(pins).toBeGreaterThan(0);

    const reminders = await prisma.notificationJob.count({ where: { cocId: first.coc.id } });
    expect(reminders).toBe(5);

    const anchors = await prisma.ledgerAnchor.count({
      where: { cocId: first.coc.id, eventType: "COC_ISSUED" },
    });
    expect(anchors).toBe(1);
  });
});
