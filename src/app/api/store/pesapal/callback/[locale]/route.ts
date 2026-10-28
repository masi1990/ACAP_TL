import { NextRequest } from "next/server";
import { pesapalBuyerReturn } from "@/lib/pesapal-return";

type Ctx = { params: Promise<{ locale: string }> };

/** Buyer return. Locale is in the path so Pesapal can append ?OrderTrackingId= cleanly. */
export async function GET(req: NextRequest, ctx: Ctx) {
  const { locale } = await ctx.params;
  return pesapalBuyerReturn(req, locale);
}
