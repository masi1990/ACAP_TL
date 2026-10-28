import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { appendAuditEvent } from "@/lib/audit";
import { canDownloadStandard, latestPostingId, logLibraryActivity } from "@/lib/library";
import { publicUriToFs } from "@/lib/preview-raster";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await ctx.params;
  const lang = String(req.nextUrl.searchParams.get("lang") || "en");
  const access = await canDownloadStandard(session.userId, id);
  if (!access) return NextResponse.json({ error: "This standard is not released to you" }, { status: 403 });

  const version = await prisma.standardVersion.findFirst({
    where: { standardId: id, publicationStatus: "PUBLISHED" },
    orderBy: { year: "desc" },
    include: { languageFiles: true, standard: true },
  });
  if (!version) return NextResponse.json({ error: "Standard not found" }, { status: 404 });
  const file = version.languageFiles.find((item) => item.locale === lang);
  const uri =
    file?.sourcePdfUri ||
    (version.authoritativeLocale === lang || !version.languageFiles.length ? version.sourcePdfUri : null);
  if (!uri) return NextResponse.json({ error: "That language is not published" }, { status: 404 });
  const path = publicUriToFs(uri);
  if (!path) return NextResponse.json({ error: "File not found" }, { status: 404 });
  let bytes: Buffer;
  try {
    bytes = await readFile(path);
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  const postingId = await latestPostingId(session.userId, access.organizationId);
  await logLibraryActivity({
    userId: session.userId,
    roleCode: "LIBRARY_OFFICER",
    organizationId: access.organizationId,
    memberStateId: access.memberStateId,
    postingId,
    action: "DOWNLOAD",
    standardId: id,
    language: lang,
  });
  await appendAuditEvent({
    actorUserId: session.userId,
    action: "LIBRARY_DOWNLOAD",
    entityType: "Standard",
    entityId: id,
    organizationId: access.organizationId,
    after: { lang },
  });
  const filename = `${version.standard.designation}-${lang}.pdf`.replace(/[^\w.\-]+/g, "_");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
