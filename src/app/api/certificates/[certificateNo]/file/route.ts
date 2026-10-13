import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { INTERNAL_CERTIFICATE_KIND } from "@/lib/dossier";
import { readDossierFile } from "@/lib/dossier-files";

type Ctx = { params: Promise<{ certificateNo: string }> };

/** Public download of the certification body's scanned internal certificate, when one was filed. */
export async function GET(_req: Request, ctx: Ctx) {
  const { certificateNo } = await ctx.params;
  const coc = await prisma.coC.findUnique({
    where: { certificateNo },
    select: { applicationId: true },
  });
  if (!coc) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });

  const attachment = await prisma.dossierAttachment.findFirst({
    where: { applicationId: coc.applicationId, kind: INTERNAL_CERTIFICATE_KIND },
  });
  if (!attachment) return NextResponse.json({ error: "No scanned certificate is on file" }, { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await readDossierFile(attachment.storageUri);
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const filename = attachment.filename.replace(/"/g, "") || `${certificateNo}.pdf`;
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": attachment.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
