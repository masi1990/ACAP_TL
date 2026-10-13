import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { requirePermission } from "@/lib/require-auth";
import { readDossierFile } from "@/lib/dossier-files";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requirePermission("certify:operate");
  if (auth.error) return auth.error;
  const session = auth.session!;
  const { id } = await ctx.params;

  const attachment = await prisma.dossierAttachment.findUnique({
    where: { id },
    include: { application: true },
  });
  if (!attachment) return NextResponse.json({ error: "File not found" }, { status: 404 });

  const own = session.user.memberships.find((m) => m.organization.type === "CB")?.organization.id;
  const allowed = can(session.user, "cb:write") || attachment.application.organizationId === own;
  if (!allowed) return NextResponse.json({ error: "You can only open files for your certification body" }, { status: 403 });

  let bytes: Buffer;
  try {
    bytes = await readDossierFile(attachment.storageUri);
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": attachment.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${attachment.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
