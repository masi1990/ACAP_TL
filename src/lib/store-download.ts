import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPesapalConfig } from "@/lib/pesapal";
import { authoritativeLocaleOrNull } from "@/lib/publication";
import { publishedLocales } from "@/lib/standard-kinds";
import { ensureLanguageEntitlement } from "@/lib/store-fulfillment";

/** Public download for a paid order. The email link points here, with item and lang for the edition. */
export async function downloadPurchasedStandard(
  orderId: string,
  requestUrl: string,
  lang?: string | null,
  catalogItemId?: string | null,
) {
  if (!orderId) {
    return NextResponse.json({ error: "Order is required" }, { status: 400 });
  }
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      lines: {
        include: {
          catalogItem: {
            include: { standardVersion: { include: { languageFiles: true } } },
          },
        },
      },
      entitlements: true,
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Download is not ready" }, { status: 404 });
  }
  const paid =
    order.status === "PAID" ||
    order.status === "FULFILLED" ||
    order.entitlements.some((row) => row.artifactUri);
  if (!paid) {
    return NextResponse.json({ error: "Download is not ready" }, { status: 404 });
  }

  const requestedItem = catalogItemId?.trim() || "";
  const line = requestedItem
    ? order.lines.find((entry) => entry.catalogItemId === requestedItem)
    : order.lines.length === 1
      ? order.lines[0]
      : null;
  if (!line) {
    return NextResponse.json({ error: "Choose which standard to download" }, { status: 400 });
  }
  const preferred = line.editionLocale || "en";
  const requested = authoritativeLocaleOrNull(lang) || preferred;
  const version = line.catalogItem.standardVersion;
  const published = publishedLocales(version.languageFiles, version.authoritativeLocale, version.sourcePdfUri);
  const allowed = new Set(published.length ? published : [preferred]);
  for (const row of order.entitlements) {
    if (row.artifactUri && row.catalogItemId === line.catalogItemId) allowed.add(row.editionLocale);
  }
  if (!allowed.has(requested)) {
    return NextResponse.json({ error: "That language is not published for this standard" }, { status: 404 });
  }

  const ready = order.entitlements.find(
    (row) => row.catalogItemId === line.catalogItemId && row.editionLocale === requested && row.artifactUri,
  );
  let entitlement = ready;
  if (!entitlement?.artifactUri) {
    try {
      entitlement = await ensureLanguageEntitlement(orderId, requested, line.catalogItemId);
    } catch {
      return NextResponse.json({ error: "Download is not ready" }, { status: 404 });
    }
  }
  if (!entitlement?.artifactUri) {
    return NextResponse.json({ error: "Download is not ready" }, { status: 404 });
  }
  const configured = getPesapalConfig().appBaseUrl;
  const origin = configured || new URL(requestUrl).origin;
  return NextResponse.redirect(new URL(entitlement.artifactUri, origin));
}
