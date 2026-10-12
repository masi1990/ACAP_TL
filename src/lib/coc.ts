import { prisma } from "./db";
import { appendAuditEvent } from "./audit";
import { sha256 } from "./auth";
import { randomBytes } from "crypto";

/** ACID-critical: issue CoC once per application with idempotency + double-issue guard */
export async function issueCertificateOfConformity(input: {
  applicationId: string;
  actorUserId?: string;
  impersonatorId?: string;
  idempotencyKey?: string;
  validityMonths?: number;
}) {
  return prisma.$transaction(async (tx) => {
    const app = await tx.certificationApplication.findUnique({
      where: { id: input.applicationId },
      include: { coc: true, product: { include: { variants: { include: { pin: true } } } } },
    });
    if (!app) throw new Error("Application not found");

    if (input.idempotencyKey) {
      const existingByKey = await tx.certificationApplication.findFirst({
        where: { idempotencyKey: input.idempotencyKey },
        include: { coc: true },
      });
      if (existingByKey?.coc) {
        return { coc: existingByKey.coc, reused: true as const };
      }
      if (app.idempotencyKey && app.idempotencyKey !== input.idempotencyKey) {
        throw new Error("Idempotency key mismatch");
      }
      if (!app.idempotencyKey) {
        await tx.certificationApplication.update({
          where: { id: app.id },
          data: { idempotencyKey: input.idempotencyKey },
        });
      }
    }

    if (app.coc) {
      return { coc: app.coc, reused: true as const };
    }

    const items = await tx.assessmentItem.findMany({
      where: { applicationId: app.id },
      include: { evidence: true },
    });
    if (items.length === 0) {
      const tests = await tx.labResult.findMany({ where: { applicationId: app.id } });
      if (tests.length !== 1 || !tests[0].pass) {
        throw new Error("Record a pass for every requirement before a certificate can be issued");
      }
    } else {
      const open = items.filter((item) => item.pass !== true);
      if (open.length) {
        throw new Error("Every requirement, national regulation, and other item must pass before a certificate can be issued");
      }
      const missingEvidence = items.filter((item) => item.kind === "table" && item.evidence.length === 0);
      if (missingEvidence.length) {
        throw new Error("Attach the laboratory result for every test in the standard tables");
      }
    }

    const months = input.validityMonths ?? 24;
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt);
    expiresAt.setMonth(expiresAt.getMonth() + months);
    const certificateNo = `COC-${app.markScheme}-${issuedAt.getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;

    const coc = await tx.coC.create({
      data: {
        applicationId: app.id,
        certificateNo,
        status: "certified",
        issuedAt,
        expiresAt,
        markScheme: app.markScheme,
      },
    });

    await tx.markGrant.create({
      data: {
        cocId: coc.id,
        markScheme: app.markScheme,
        status: "ACTIVE",
        grantedAt: issuedAt,
      },
    });

    await tx.certificationApplication.update({
      where: { id: app.id },
      data: { status: "CERTIFIED" },
    });

    // Ensure each variant has a PIN
    for (const variant of app.product.variants) {
      if (!variant.pin) {
        const pinCode = `PIN-${randomBytes(4).toString("hex").toUpperCase()}`;
        await tx.productPin.create({
          data: {
            variantId: variant.id,
            pinCode,
            qrPayload: JSON.stringify({ pin: pinCode, coc: certificateNo }),
            status: "certified",
            cocId: coc.id,
            issuedAt,
            expiresAt,
          },
        });
      } else {
        await tx.productPin.update({
          where: { id: variant.pin.id },
          data: { status: "certified", cocId: coc.id, issuedAt, expiresAt },
        });
      }
    }

    const payloadHash = sha256(
      JSON.stringify({
        certificateNo,
        applicationId: app.id,
        status: "certified",
        issuedAt: issuedAt.toISOString(),
      }),
    );
    await tx.ledgerAnchor.create({
      data: {
        cocId: coc.id,
        eventType: "COC_ISSUED",
        payloadHash,
        blockRef: `stub-${payloadHash.slice(0, 12)}`,
        entityRef: certificateNo,
      },
    });

    await tx.webhookOutbox.create({
      data: {
        eventType: "CertificateIssued",
        payloadJson: JSON.stringify({
          certificateNo,
          status: "certified",
          productId: app.productId,
          markScheme: app.markScheme,
        }),
        targetHint: "EAC",
      },
    });

    // Expiry reminders 6/4/3/2/1 months
    for (const monthsOut of [6, 4, 3, 2, 1]) {
      const scheduledFor = new Date(expiresAt);
      scheduledFor.setMonth(scheduledFor.getMonth() - monthsOut);
      await tx.notificationJob.create({
        data: {
          cocId: coc.id,
          kind: "EXPIRY_REMINDER",
          monthsOut,
          scheduledFor,
          status: "PENDING",
        },
      });
    }

    return { coc, reused: false as const };
  }).then(async (result) => {
    await appendAuditEvent({
      actorUserId: input.actorUserId,
      impersonatorId: input.impersonatorId,
      action: result.reused ? "COC_ISSUE_IDEMPOTENT" : "COC_ISSUED",
      entityType: "CoC",
      entityId: result.coc.id,
      after: { certificateNo: result.coc.certificateNo, status: result.coc.status },
    });
    return result;
  });
}
