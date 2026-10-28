import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const auth = await requirePermission("portal:operate");
  if (auth.error) return auth.error;
  const body = await req.json();
  const id = String(body.id || "").trim();
  const status = String(body.status || "").trim();
  const arsoNote = String(body.arsoNote || "").trim();
  if (!id || (status !== "approved" && status !== "rejected")) {
    return NextResponse.json({ error: "Choose approve or reject" }, { status: 400 });
  }
  const request = await prisma.portalRelistRequest.findUnique({ where: { id } });
  if (!request || request.status !== "pending") {
    return NextResponse.json({ error: "That request is no longer pending" }, { status: 404 });
  }
  const mark = await prisma.importedCertifiedMark.findUnique({ where: { pinText: request.pinText } });
  if (!mark) return NextResponse.json({ error: "Copied mark not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.portalRelistRequest.update({
      where: { id },
      data: {
        status,
        arsoNote,
        decidedById: auth.session!.userId,
        decidedAt: new Date(),
      },
    });
    if (status === "approved") {
      await tx.productPortalDecision.create({
        data: {
          pinText: mark.pinText,
          liveProductId: mark.liveProductId,
          cbName: mark.cbName,
          status: "listed",
          reason: arsoNote || "Relist request approved",
          decidedById: auth.session!.userId,
        },
      });
    }
  });

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: status === "approved" ? "PORTAL_RELIST_APPROVE" : "PORTAL_RELIST_REJECT",
    entityType: "PortalRelistRequest",
    entityId: id,
    reason: arsoNote,
    after: { pinText: request.pinText, status },
  });
  return NextResponse.json({ ok: true });
}
