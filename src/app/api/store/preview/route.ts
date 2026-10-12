import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePreviewPdf } from "@/lib/pdf";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const item = await prisma.catalogItem.findUnique({
    where: { id: String(body.catalogItemId) },
    include: { standardVersion: { include: { standard: true } } },
  });
  if (!item) return NextResponse.json({ error: "Catalog item not found" }, { status: 404 });
  const previewUri = await generatePreviewPdf({
    designation: item.standardVersion.editionLabel,
    title: item.coverTitle,
    scope: item.standardVersion.scopeEn,
    filename: `preview-${item.standardVersion.id}.pdf`,
  });
  return NextResponse.json({ previewUri });
}
