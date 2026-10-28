import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicUriToFs } from "@/lib/preview-raster";
import { authoritativeLocaleOrNull } from "@/lib/publication";

/** Download a standard that is listed as free to download. View-only listings are refused. */
export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get("item")?.trim() || "";
  const lang = authoritativeLocaleOrNull(req.nextUrl.searchParams.get("lang"));
  if (!itemId || !lang) {
    return NextResponse.json({ error: "Choose a published language" }, { status: 400 });
  }

  const item = await prisma.catalogItem.findUnique({
    where: { id: itemId },
    include: { standardVersion: { include: { standard: true, languageFiles: true } } },
  });
  if (!item?.active || item.distribution !== "FREE_DOWNLOAD") {
    return NextResponse.json({ error: "This standard cannot be downloaded" }, { status: 404 });
  }

  const version = item.standardVersion;
  const file = version.languageFiles.find((row) => row.locale === lang);
  const uri = file?.sourcePdfUri || (version.authoritativeLocale === lang ? version.sourcePdfUri : null);
  if (!uri) return NextResponse.json({ error: "That language is not published" }, { status: 404 });
  const path = publicUriToFs(uri);
  if (!path) return NextResponse.json({ error: "File not found" }, { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await readFile(path);
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const filename = `${version.standard.designation}-${lang}.pdf`.replace(/[^\w.\-]+/g, "_");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
