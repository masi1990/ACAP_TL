import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const auth = await requirePermission("portal:operate");
  if (auth.error) return auth.error;
  const body = await req.json();
  const pinText = String(body.pinText || "").trim();
  const status = String(body.status || "").trim();
  const reason = String(body.reason || "").trim();
  if (!pinText || (status !== "listed" && status !== "removed")) {
    return NextResponse.json({ error: "A PIN and a listing decision are required" }, { status: 400 });
  }
  if (status === "removed" && !reason) {
    return NextResponse.json({ error: "A reason is required to remove a product from the public registry" }, { status: 400 });
  }
  const mark = await prisma.importedCertifiedMark.findUnique({ where: { pinText } });
  if (!mark) return NextResponse.json({ error: "Copied mark not found" }, { status: 404 });
  const decision = await prisma.productPortalDecision.create({
    data: {
      pinText,
      liveProductId: mark.liveProductId,
      cbName: mark.cbName,
      status,
      reason,
      decidedById: auth.session!.userId,
    },
  });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: status === "removed" ? "PORTAL_REMOVE" : "PORTAL_LIST",
    entityType: "ImportedCertifiedMark",
    entityId: mark.id,
    reason,
    after: { pinText, status },
  });
  return NextResponse.json({ ok: true, id: decision.id });
}
