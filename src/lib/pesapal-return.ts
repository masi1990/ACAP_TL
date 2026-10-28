import { NextRequest, NextResponse } from "next/server";
import { fulfillByPesapalTrackingId } from "@/lib/store-fulfillment";
import { getPesapalConfig } from "@/lib/pesapal";

const LOCALES = new Set(["en", "fr", "pt", "ar"]);

export function storeLocale(raw: string | null | undefined) {
  const value = String(raw || "").trim();
  return LOCALES.has(value) ? value : "en";
}

/**
 * Pesapal appends ?OrderTrackingId= to the callback. The callback itself must
 * not already contain a query string, or a phone browser receives a broken URL.
 */
export async function pesapalBuyerReturn(req: NextRequest, localeRaw?: string | null) {
  const orderTrackingId = req.nextUrl.searchParams.get("OrderTrackingId")?.trim() || "";
  const locale = storeLocale(localeRaw || req.nextUrl.searchParams.get("locale"));
  const origin = getPesapalConfig().appBaseUrl;

  if (!orderTrackingId) {
    const fail = new URL(`/${locale}/store/return`, origin);
    fail.searchParams.set("error", "missing_tracking");
    return NextResponse.redirect(fail);
  }

  try {
    const outcome = await fulfillByPesapalTrackingId(orderTrackingId);
    const dest = new URL(`/${locale}/store/return`, origin);
    dest.searchParams.set("OrderTrackingId", orderTrackingId);
    dest.searchParams.set("status", outcome.status);
    if (outcome.orderId) dest.searchParams.set("orderId", outcome.orderId);
    if (outcome.result?.artifactUri) {
      dest.searchParams.set("artifact", outcome.result.artifactUri);
    }
    return NextResponse.redirect(dest);
  } catch (err) {
    const dest = new URL(`/${locale}/store/return`, origin);
    dest.searchParams.set("OrderTrackingId", orderTrackingId);
    dest.searchParams.set("error", err instanceof Error ? err.message : "callback_failed");
    return NextResponse.redirect(dest);
  }
}
