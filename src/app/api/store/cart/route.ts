import { NextRequest, NextResponse } from "next/server";
import { parseCheckoutLines, quoteCartLines } from "@/lib/store-checkout";

/** Current prices for the standards in a browser cart. */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("items") || "";
  const inputs = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const splitAt = part.indexOf(":");
      if (splitAt < 0) return { catalogItemId: part, editionLocale: "" };
      return { catalogItemId: part.slice(0, splitAt), editionLocale: part.slice(splitAt + 1) };
    });
  const quote = await quoteCartLines(parseCheckoutLines({ lines: inputs }));
  return NextResponse.json(quote);
}
