import { prisma } from "@/lib/db";
import { generateWatermarkedStandardPdf } from "@/lib/pdf";
import { appendAuditEvent } from "@/lib/audit";
import { authoritativeLocaleOrNull } from "@/lib/publication";
import { downloadLocaleOrder, publishedLocales } from "@/lib/standard-kinds";
import { notifyAfterCommit, queueStoreFulfilled } from "@/lib/notifications";

export type FulfillOrderResult = {
  orderId: string;
  artifactUri: string;
  watermarkText: string;
  alreadyFulfilled: boolean;
};

type PaidOrder = NonNullable<Awaited<ReturnType<typeof loadPaidOrder>>>;

function loadPaidOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payments: true,
      lines: {
        include: {
          catalogItem: {
            include: { standardVersion: { include: { standard: true, languageFiles: true } } },
          },
        },
      },
    },
  });
}

function fullTextOf(machineDocJson: string, scopeEn: string) {
  try {
    const machine = JSON.parse(machineDocJson) as { fullText?: string };
    if (machine.fullText?.trim()) return machine.fullText;
  } catch {
    /* scope remains the fallback body when no machine pack is stored */
  }
  return scopeEn;
}

function languagesForLine(line: PaidOrder["lines"][number]) {
  const version = line.catalogItem.standardVersion;
  const preferred = line.editionLocale || version.authoritativeLocale || "en";
  return downloadLocaleOrder(
    publishedLocales(version.languageFiles, version.authoritativeLocale, version.sourcePdfUri),
    preferred,
  );
}

function mailItems(order: PaidOrder) {
  return order.lines.map((line) => ({
    catalogItemId: line.catalogItemId,
    title: line.catalogItem.coverTitle || line.catalogItem.standardVersion.editionLabel || "ARSO standard",
    languages: languagesForLine(line),
  }));
}

async function queueFulfillmentMail(order: PaidOrder, artifactUri: string) {
  const items = mailItems(order);
  const line = order.lines[0];
  const title =
    items.length > 1
      ? items.map((item) => item.title).join(", ")
      : items[0]?.title || "ARSO standard";
  await queueStoreFulfilled({
    orderId: order.id,
    buyerEmail: order.buyerEmail,
    buyerName: order.buyerName,
    title,
    artifactUri,
    locale: order.locale,
    editionLocale: line?.editionLocale || "en",
    languages: items[0]?.languages || [],
    items,
  });
  await notifyAfterCommit();
}

function lineForDownload(order: PaidOrder, editionLocale: string, catalogItemId?: string) {
  if (catalogItemId) {
    return order.lines.find((line) => line.catalogItemId === catalogItemId) || null;
  }
  if (order.lines.length === 1) return order.lines[0];
  const locale = authoritativeLocaleOrNull(editionLocale);
  const matches = order.lines.filter((line) => line.editionLocale === locale);
  return matches.length === 1 ? matches[0] : null;
}

/** Watermark one published language of one standard on a paid order. Reuses the file when it already exists. */
export async function ensureLanguageEntitlement(orderId: string, editionLocale: string, catalogItemId?: string) {
  const order = await loadPaidOrder(orderId);
  if (!order) throw new Error(`Order not found: ${orderId}`);
  if (order.status !== "PAID" && order.status !== "FULFILLED") {
    throw new Error(`Order ${orderId} is not paid`);
  }
  const line = lineForDownload(order, editionLocale, catalogItemId);
  if (!line) throw new Error(`Order ${orderId} has no matching standard`);

  const item = line.catalogItem;
  const version = item.standardVersion;
  const locale = authoritativeLocaleOrNull(editionLocale) || line.editionLocale || version.authoritativeLocale;
  const existing = await prisma.standardEntitlement.findFirst({
    where: { orderId, catalogItemId: item.id, editionLocale: locale, artifactUri: { not: null } },
  });
  if (existing?.artifactUri) return existing;

  const languageFile = version.languageFiles.find((file) => file.locale === locale);
  const authoritative = authoritativeLocaleOrNull(version.authoritativeLocale) || "en";
  const sourcePdfUri =
    languageFile?.sourcePdfUri || (locale === authoritative ? version.sourcePdfUri : null);
  const watermarkText = `Licensed to ${order.buyerName} <${order.buyerEmail}> · Order ${order.id}`;
  const artifactUri = await generateWatermarkedStandardPdf({
    designation: version.editionLabel,
    title: item.coverTitle,
    scope: version.scopeEn,
    fullText: fullTextOf(version.machineDocJson, version.scopeEn),
    sourcePdfUri,
    purchaser: `${order.buyerName} <${order.buyerEmail}>`,
    orderId: order.id,
    filename: `purchased-${order.id}-${item.id}-${locale}`,
  });

  try {
    return await prisma.standardEntitlement.create({
      data: {
        orderId: order.id,
        buyerEmail: order.buyerEmail,
        catalogItemId: item.id,
        editionLocale: locale,
        artifactUri,
        watermarkText,
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      const row = await prisma.standardEntitlement.findFirst({
        where: { orderId: order.id, catalogItemId: item.id, editionLocale: locale },
      });
      if (row?.artifactUri) return row;
    }
    throw err;
  }
}

/**
 * Idempotent: if an entitlement already exists for the order, return it.
 * Confirms the matching payment attempt, watermarks the chosen language, grants entitlement.
 */
export async function fulfillPaidOrder(opts: {
  orderId: string;
  paymentAttemptId?: string;
  providerRef?: string;
}): Promise<FulfillOrderResult> {
  const order = await loadPaidOrder(opts.orderId);
  if (!order) throw new Error(`Order not found: ${opts.orderId}`);
  if (order.lines.length === 0) throw new Error(`Order ${opts.orderId} has no line items`);

  const entitled = await prisma.standardEntitlement.findMany({
    where: { orderId: order.id, artifactUri: { not: null } },
  });
  const ready = new Set(entitled.map((row) => `${row.catalogItemId}:${row.editionLocale}`));
  const pending = order.lines.filter((line) => !ready.has(`${line.catalogItemId}:${line.editionLocale}`));
  if (pending.length === 0) {
    if (order.status !== "FULFILLED") {
      await prisma.order.update({ where: { id: order.id }, data: { status: "FULFILLED" } });
    }
    const first = entitled[0];
    await queueFulfillmentMail(order, first?.artifactUri || "");
    return {
      orderId: opts.orderId,
      artifactUri: first?.artifactUri || "",
      watermarkText: first?.watermarkText || "",
      alreadyFulfilled: true,
    };
  }

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

  let artifactUri = "";
  let watermarkText = "";
  for (const line of order.lines) {
    const editionLocale = line.editionLocale || line.catalogItem.standardVersion.authoritativeLocale;
    const entitlement = await ensureLanguageEntitlement(order.id, editionLocale, line.catalogItemId);
    if (!artifactUri && entitlement.artifactUri) {
      artifactUri = entitlement.artifactUri;
      watermarkText = entitlement.watermarkText || "";
    }
  }

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

  await queueFulfillmentMail(order, artifactUri);

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
  const described = String(txn.payment_status_description || "").toUpperCase();
  const status = described === "COMPLETED" || txn.status_code === 1 ? "COMPLETED" : described;

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
    const notSubmitted = txn.error?.code === "payment_details_not_found";
    if (!notSubmitted && (status === "FAILED" || status === "INVALID")) {
      await prisma.paymentAttempt.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: "FAILED" },
      });
    }
    return { status: notSubmitted ? "PENDING" : status || "PENDING", orderId: payment.orderId };
  }

  const result = await fulfillPaidOrder({
    orderId: payment.orderId,
    paymentAttemptId: payment.id,
    providerRef: orderTrackingId,
  });
  return { status: "COMPLETED", result, orderId: payment.orderId };
}
