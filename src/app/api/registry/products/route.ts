import { NextRequest, NextResponse } from "next/server";
import { listCertifiedProducts, type MarkFilter, type StatusFilter } from "@/lib/registry";

/** Public certified-products registry (no auth). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mark = (sp.get("mark") || "ALL").toUpperCase() as MarkFilter;
  const status = (sp.get("status") || "ALL") as StatusFilter;
  const data = await listCertifiedProducts({
    q: sp.get("q") || undefined,
    mark: ["ALL", "QUALITY", "ECO", "BOTH"].includes(mark) ? mark : "ALL",
    status: ["ALL", "certified", "expired", "suspended", "withdrawn"].includes(status)
      ? status
      : "ALL",
    country: sp.get("country") || undefined,
    region: sp.get("region") || undefined,
    rec: sp.get("rec") || undefined,
    standardVersionId: sp.get("standardVersionId") || undefined,
    designation: sp.get("designation") || undefined,
    page: Number(sp.get("page") || 1) || 1,
    pageSize: Number(sp.get("pageSize") || 12) || 12,
  });
  return NextResponse.json({ ok: true, ...data });
}
