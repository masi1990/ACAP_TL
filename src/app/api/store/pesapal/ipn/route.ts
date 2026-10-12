import { NextRequest, NextResponse } from "next/server";
import { fulfillByPesapalTrackingId } from "@/lib/store-fulfillment";

/**
 * Pesapal IPN (GET) — mirrors thebunch WooCommerce plugin notify URL.
 * Query: OrderTrackingId, OrderMerchantReference, OrderNotificationType
 */
export async function GET(req: NextRequest) {
  const orderTrackingId = req.nextUrl.searchParams.get("OrderTrackingId")?.trim() || "";
  const notificationType = req.nextUrl.searchParams.get("OrderNotificationType")?.trim() || "";

  if (!orderTrackingId) {
    return NextResponse.json({ error: "OrderTrackingId required" }, { status: 400 });
  }

  try {
    const outcome = await fulfillByPesapalTrackingId(orderTrackingId);
    // Plugin-style ack body Pesapal expects for GET IPN
    return new NextResponse(
      `${orderTrackingId}|${notificationType || "IPNCHANGE"}|${outcome.status}`,
      {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "IPN processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
