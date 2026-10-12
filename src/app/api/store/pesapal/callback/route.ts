import { NextRequest, NextResponse } from "next/server";
import { fulfillByPesapalTrackingId } from "@/lib/store-fulfillment";
import { getPesapalConfig } from "@/lib/pesapal";

/**
 * Buyer return URL after Pesapal hosted checkout.
 * Confirms status, fulfills if COMPLETED, redirects to the public store return page.
 * The redirect must use APP_BASE_URL. The dev server listens on 0.0.0.0, and a
 * redirect built from that host fails in the buyer's browser.
 */
export async function GET(req: NextRequest) {
  const orderTrackingId = req.nextUrl.searchParams.get("OrderTrackingId")?.trim() || "";
  const locale = req.nextUrl.searchParams.get("locale")?.trim() || "en";
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
