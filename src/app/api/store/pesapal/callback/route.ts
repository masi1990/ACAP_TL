import { NextRequest } from "next/server";
import { pesapalBuyerReturn } from "@/lib/pesapal-return";

/** Buyer return when Pesapal calls the callback without a locale segment. */
export async function GET(req: NextRequest) {
  return pesapalBuyerReturn(req);
}
