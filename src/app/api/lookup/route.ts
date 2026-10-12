import { NextRequest, NextResponse } from "next/server";
import { resolveTariffStandardsPack } from "@/lib/tariff";

export async function GET(req: NextRequest) {
  const rec = req.nextUrl.searchParams.get("rec") || "";
  const code = req.nextUrl.searchParams.get("code") || "";
  const publicView = req.nextUrl.searchParams.get("public") !== "0";
  const result = await resolveTariffStandardsPack(rec, code, { publicView });
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
