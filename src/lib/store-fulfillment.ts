import { prisma } from "@/lib/db";
import { generateWatermarkedStandardPdf } from "@/lib/pdf";
import { appendAuditEvent } from "@/lib/audit";
import { notifyAfterCommit, queueStoreFulfilled } from "@/lib/notifications";

export type FulfillOrderResult = {
  orderId: string;
  artifactUri: string;
  watermarkText: string;
  alreadyFulfilled: boolean;
};

/**
 * Idempotent: if entitlement already exists for the order, return it.
 * Confirms the matching payment attempt, watermarks PDF, grants entitlement.
 */
export async function fulfillPaidOrder(opts: {
  orderId: string;
  paymentAttemptId?: string;
  providerRef?: string;
}): Promise<FulfillOrderResult> {
  const existing = await prisma.standardEntitlement.findFirst({
    where: { orderId: opts.orderId },
  });
  if (existing?.artifactUri) {
    const paid = await prisma.order.findUnique({
      where: { id: opts.orderId },
      include: { lines: { include: { catalogItem: true } } },
    });
    if (paid) {
      await queueStoreFulfilled({
        orderId: paid.id,
        buyerEmail: paid.buyerEmail,
        buyerName: paid.buyerName,
        title: paid.lines[0]?.catalogItem.coverTitle || "ARSO standard",
        artifactUri: existing.artifactUri,
        locale: paid.locale,
      });
      await notifyAfterCommit();
    }
    return {
      orderId: opts.orderId,
      artifactUri: existing.artifactUri,
      watermarkText: existing.watermarkText || "",
      alreadyFulfilled: true,
    };
  }

  const order = await prisma.order.findUnique({
    where: { id: opts.orderId },
    include: {
      payments: true,
      lines: {
        include: {
          catalogItem: { include: { standardVersion: { include: { standard: true } } } },
        },
      },
    },
  });
  if (!order) throw new Error(`Order not found: ${opts.orderId}`);

  const line = order.lines[0];
  if (!line) throw new Error(`Order ${opts.orderId} has no line items`);

  const item = line.catalogItem;
  const payment =
    (opts.paymentAttemptId
      ? order.payments.find((p) => p.id === opts.paymentAttemptId)
      : undefined) ||
    (opts.providerRef
      ? order.payments.find((p) => p.providerRef === opts.providerRef)
      : undefined) ||
    order.payments[0];

  if (payment && payment.status !== "CONFIRMED") {
    await prisma.paymentAttempt.update({
      where: { id: payment.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        ...(opts.providerRef && !payment.providerRef ? { providerRef: opts.providerRef } : {}),
      },
    });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "PAID" },
  });

  const watermarkText = `Licensed to ${order.buyerName} <${order.buyerEmail}> · Order ${order.id}`;
  let fullText = item.standardVersion.scopeEn;
  try {
    const machine = JSON.parse(item.standardVersion.machineDocJson) as { fullText?: string };
    if (machine.fullText?.trim()) fullText = machine.fullText;
  } catch {
    /* scope remains the fallback body when no machine pack is stored */
  }
  const artifactUri = await generateWatermarkedStandardPdf({
    designation: item.standardVersion.editionLabel,
    title: item.coverTitle,
    scope: item.standardVersion.scopeEn,
    fullText,
    sourcePdfUri: item.standardVersion.sourcePdfUri,
    purchaser: `${order.buyerName} <${order.buyerEmail}>`,
    orderId: order.id,
    filename: `purchased-${order.id}`,
  });

  await prisma.standardEntitlement.create({
    data: {
      orderId: order.id,
      buyerEmail: order.buyerEmail,
      catalogItemId: item.id,
      artifactUri,
      watermarkText,
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "FULFILLED" },
  });

  await appendAuditEvent({
    action: "STORE_PURCHASE_FULFILLED",
    entityType: "Order",
    entityId: order.id,
    after: {
      buyerEmail: order.buyerEmail,
      artifactUri,
      providerRef: payment?.providerRef || opts.providerRef || null,
    },
  });

  await queueStoreFulfilled({
    orderId: order.id,
    buyerEmail: order.buyerEmail,
    buyerName: order.buyerName,
    title: item.coverTitle,
    artifactUri,
    locale: order.locale,
  });
  await notifyAfterCommit();

  return {
    orderId: order.id,
    artifactUri,
    watermarkText,
    alreadyFulfilled: false,
  };
}

/** Confirm payment from Pesapal tracking id and fulfill when COMPLETED. */
export async function fulfillByPesapalTrackingId(orderTrackingId: string): Promise<{
  status: string;
  result?: FulfillOrderResult;
  orderId?: string;
}> {
  const payment = await prisma.paymentAttempt.findFirst({
    where: { provider: "PESAPAL", providerRef: orderTrackingId },
    include: { order: true },
  });
  if (!payment) {
    return { status: "UNKNOWN_TRACKING_ID" };
  }

  const { getPesapalConfig, getAccessToken, getTransactionStatus } = await import("@/lib/pesapal");
  const config = getPesapalConfig();
  if (!config.configured) {
    throw new Error("Pesapal is not configured");
  }

  const token = await getAccessToken(config.consumerKey, config.consumerSecret, config.env);
  const txn = await getTransactionStatus(token, config.env, orderTrackingId);
  const status = String(txn.payment_status_description || "").toUpperCase();

  await prisma.paymentAttempt.update({
    where: { id: payment.id },
    data: {
      confirmationCode: txn.confirmation_code || null,
      paymentMethod: txn.payment_method || null,
      statusDetail: status || txn.message || "PENDING",
      rawJson: JSON.stringify(txn),
    },
  });

  if (status !== "COMPLETED") {
    if (status === "FAILED" || status === "INVALID") {
      await prisma.paymentAttempt.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: "FAILED" },
      });
    }
    return { status: status || "PENDING", orderId: payment.orderId };
  }

  const result = await fulfillPaidOrder({
    orderId: payment.orderId,
    paymentAttemptId: payment.id,
    providerRef: orderTrackingId,
  });
  return { status: "COMPLETED", result, orderId: payment.orderId };
}
