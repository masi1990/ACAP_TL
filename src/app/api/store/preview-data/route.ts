import { NextRequest, NextResponse } from "next/server";
import { getCatalogPreviewPayload } from "@/lib/store-preview-server";

export async function GET(req: NextRequest) {
  const catalogItemId = req.nextUrl.searchParams.get("catalogItemId");
  const lang = req.nextUrl.searchParams.get("lang");
  if (!catalogItemId) {
    return NextResponse.json({ error: "catalogItemId required" }, { status: 400 });
  }
  const payload = await getCatalogPreviewPayload(catalogItemId, lang);
  if (!payload) {
    return NextResponse.json({ error: "Catalog item not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, ...payload });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const catalogItemId = String(body.catalogItemId || "");
  const lang = body.lang ? String(body.lang) : null;
  if (!catalogItemId) {
    return NextResponse.json({ error: "catalogItemId required" }, { status: 400 });
  }
  const payload = await getCatalogPreviewPayload(catalogItemId, lang);
  if (!payload) {
    return NextResponse.json({ error: "Catalog item not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, ...payload });
}
