import { NextRequest, NextResponse } from "next/server";
import { catalogueCsv, cataloguePdf, listPublicCatalogue } from "@/lib/catalogue-list";
import { isLocale, type Locale } from "@/lib/i18n";

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "csv";
  const localeParam = req.nextUrl.searchParams.get("locale") || "en";
  const locale: Locale = isLocale(localeParam) ? localeParam : "en";
  const rows = await listPublicCatalogue(locale, {
    q: req.nextUrl.searchParams.get("q") || "",
    sector: req.nextUrl.searchParams.get("sector") || "",
    committee: req.nextUrl.searchParams.get("committee") || "",
    tariff: req.nextUrl.searchParams.get("tariff") || "",
  });
  if (format === "pdf") {
    const bytes = await cataloguePdf(rows);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=\"african-standards.pdf\"",
      },
    });
  }
  return new NextResponse(catalogueCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"african-standards.csv\"",
    },
  });
}
