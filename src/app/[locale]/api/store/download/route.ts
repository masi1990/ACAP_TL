import { NextRequest } from "next/server";
import { downloadPurchasedStandard } from "@/lib/store-download";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("order")?.trim() || "";
  const lang = req.nextUrl.searchParams.get("lang");
  const item = req.nextUrl.searchParams.get("item");
  return downloadPurchasedStandard(orderId, req.url, lang, item);
}
