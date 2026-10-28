import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";
import { portalStatusByPin } from "@/lib/imported-marks";

export async function POST(req: NextRequest) {
  const auth = await requirePermission("certify:operate");
  if (auth.error) return auth.error;
  const body = await req.json();
  const pinText = String(body.pinText || "").trim();
  const reason = String(body.reason || "").trim();
  if (!pinText || !reason) {
    return NextResponse.json({ error: "The PIN and a reason are required" }, { status: 400 });
  }
  const mark = await prisma.importedCertifiedMark.findUnique({ where: { pinText } });
  if (!mark) return NextResponse.json({ error: "Copied mark not found" }, { status: 404 });
  const memberships = (auth.session!.user.memberships ?? []).filter((membership) => membership.organization.type === "CB");
  const names = memberships.map((membership) => membership.organization.name.trim().toLowerCase());
  const ownsLinkedBody = Boolean(mark.certificationBodyOrgId && memberships.some((membership) => membership.organization.id === mark.certificationBodyOrgId));
  if (!ownsLinkedBody && !names.includes(mark.cbName.trim().toLowerCase())) {
    return NextResponse.json({ error: "This mark belongs to another certification body" }, { status: 403 });
  }
  const portals = await portalStatusByPin([pinText]);
  if (portals.status.get(pinText) !== "removed") {
    return NextResponse.json({ error: "This product is already on the public registry" }, { status: 400 });
  }
  const pending = await prisma.portalRelistRequest.findFirst({
    where: { pinText, status: "pending" },
  });
  if (pending) {
    return NextResponse.json({ error: "A return request is already waiting for ARSO" }, { status: 409 });
  }
  const request = await prisma.portalRelistRequest.create({
    data: {
      pinText,
      cbName: mark.cbName,
      requesterId: auth.session!.userId,
      reason,
    },
  });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "PORTAL_RELIST_REQUEST",
    entityType: "PortalRelistRequest",
    entityId: request.id,
    reason,
    after: { pinText },
  });
  return NextResponse.json({ ok: true, id: request.id });
}
