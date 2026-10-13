import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPesapalConfig } from "@/lib/pesapal";

/** Public download for a paid order. The email link points here. */
export async function downloadPurchasedStandard(orderId: string, requestUrl: string) {
  if (!orderId) {
    return NextResponse.json({ error: "Order is required" }, { status: 400 });
  }
  const entitlement = await prisma.standardEntitlement.findFirst({
    where: { orderId },
  });
  if (!entitlement?.artifactUri) {
    return NextResponse.json({ error: "Download is not ready" }, { status: 404 });
  }
  const configured = getPesapalConfig().appBaseUrl;
  const origin = configured || new URL(requestUrl).origin;
  return NextResponse.redirect(new URL(entitlement.artifactUri, origin));
}
