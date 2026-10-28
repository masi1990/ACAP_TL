import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-auth";
import { can } from "@/lib/rbac";
import { appendAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const user = auth.session!.user;
  if (!can(user, "standards:write") && !can(user, "products:write") && !can(user, "portal:operate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const pinText = String(body.pinText || "").trim();
  const standardVersionId = String(body.standardVersionId || "").trim();
  const manufacturerOrgId = String(body.manufacturerOrgId || "").trim();
  const certificationBodyOrgId = String(body.certificationBodyOrgId || "").trim();
  if (!pinText) return NextResponse.json({ error: "PIN is required" }, { status: 400 });
  const mark = await prisma.importedCertifiedMark.findUnique({ where: { pinText } });
  if (!mark) return NextResponse.json({ error: "Copied mark not found" }, { status: 404 });

  if (standardVersionId) {
    const version = await prisma.standardVersion.findUnique({ where: { id: standardVersionId } });
    if (!version) return NextResponse.json({ error: "Choose a standard you have already uploaded" }, { status: 400 });
  }
  if (manufacturerOrgId) {
    const manufacturer = await prisma.organization.findUnique({ where: { id: manufacturerOrgId } });
    if (!manufacturer || !["MANUFACTURER", "IMPORTER", "CLIENT"].includes(manufacturer.type)) {
      return NextResponse.json({ error: "Choose a manufacturer or importer" }, { status: 400 });
    }
  }
  if (certificationBodyOrgId) {
    const bodyOrg = await prisma.organization.findUnique({ where: { id: certificationBodyOrgId } });
    if (!bodyOrg || bodyOrg.type !== "CB") {
      return NextResponse.json({ error: "Choose a certification body" }, { status: 400 });
    }
  }

  await prisma.importedCertifiedMark.update({
    where: { pinText },
    data: {
      standardVersionId: standardVersionId || null,
      manufacturerOrgId: manufacturerOrgId || null,
      certificationBodyOrgId: certificationBodyOrgId || null,
    },
  });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "IMPORTED_MARK_LINKS",
    entityType: "ImportedCertifiedMark",
    entityId: mark.id,
    after: { pinText, standardVersionId: standardVersionId || null, manufacturerOrgId: manufacturerOrgId || null, certificationBodyOrgId: certificationBodyOrgId || null },
  });
  return NextResponse.json({ ok: true });
}
