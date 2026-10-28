import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readDossierFile } from "@/lib/dossier-files";
import { requirePermission } from "@/lib/require-auth";
import { memberMayViewFile } from "@/lib/product-view-access";

type Ctx = { params: Promise<{ kind: string; id: string }> };

function evidencePath(storageUri: string) {
  const prefix = "/uploads/lab/";
  if (!storageUri.startsWith(prefix)) throw new Error("Invalid file");
  const base = path.basename(storageUri);
  if (`${prefix}${base}` !== storageUri) throw new Error("Invalid file");
  return path.join(process.cwd(), "public", "uploads", "lab", base);
}

/** Inline preview for the border desk. Top-level navigation is refused so the file is not saved as a download. */
export async function GET(req: Request, ctx: Ctx) {
  const { kind, id } = await ctx.params;
  const auth = await requirePermission("customs:decide");
  const inspect = auth.error ? await requirePermission("inspect:write") : null;
  const session = auth.session ?? inspect?.session;
  if (auth.error && inspect?.error) {
    if (!session || !(await memberMayViewFile(session, kind, id))) return auth.error;
  }

  if (req.headers.get("sec-fetch-dest") === "document" && req.headers.get("sec-fetch-user")) {
    return NextResponse.json(
      { error: "Open this file from the customs desk. It cannot be downloaded." },
      { status: 403 },
    );
  }

  let bytes: Buffer;
  let contentType = "application/octet-stream";
  try {
    if (kind === "dossier") {
      const attachment = await prisma.dossierAttachment.findUnique({ where: { id } });
      if (!attachment) return NextResponse.json({ error: "File not found" }, { status: 404 });
      bytes = await readDossierFile(attachment.storageUri);
      contentType = attachment.contentType || contentType;
    } else if (kind === "evidence") {
      const evidence = await prisma.labEvidence.findUnique({ where: { id } });
      if (!evidence) return NextResponse.json({ error: "File not found" }, { status: 404 });
      bytes = await readFile(evidencePath(evidence.storageUri));
      contentType = evidence.contentType || contentType;
    } else {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": inlineContentType(bytes, contentType),
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}

function inlineContentType(bytes: Buffer, stored: string) {
  const type = stored.trim().toLowerCase();
  if (type && type !== "application/octet-stream") return stored;
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  return stored || "application/octet-stream";
}
