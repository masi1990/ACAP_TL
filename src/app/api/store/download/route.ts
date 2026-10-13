import { NextRequest } from "next/server";
import { downloadPurchasedStandard } from "@/lib/store-download";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("order")?.trim() || "";
  return downloadPurchasedStandard(orderId, req.url);
}
