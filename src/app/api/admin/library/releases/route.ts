import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";
import { logLibraryActivity, sendStandardRelease } from "@/lib/library";

export async function POST(req: NextRequest) {
  const auth = await requirePermission("institutions:write");
  if (auth.error) return auth.error;
  const body = await req.json().catch(() => ({}));
  const requestId = String(body.requestId || "").trim();
  const decision = String(body.decision || "send");
  const request = requestId
    ? await prisma.libraryStandardRequest.findUnique({ where: { id: requestId } })
    : null;
  if (requestId && (!request || request.status !== "PENDING")) {
    return NextResponse.json({ error: "That request is no longer pending" }, { status: 400 });
  }
  if (decision === "reject") {
    if (!request) return NextResponse.json({ error: "Choose a request" }, { status: 400 });
    await prisma.libraryStandardRequest.update({
      where: { id: request.id },
      data: { status: "REJECTED", reviewedById: auth.session!.userId, reviewedAt: new Date() },
    });
    await logLibraryActivity({
      userId: request.userId,
      organizationId: request.organizationId,
      memberStateId: request.memberStateId,
      action: "STANDARD_REQUEST_REJECTED",
      detail: request.email,
    });
    await appendAuditEvent({
      actorUserId: auth.session!.userId,
      action: "LIBRARY_STANDARD_REQUEST_REJECT",
      entityType: "LibraryStandardRequest",
      entityId: request.id,
      organizationId: request.organizationId,
    });
    return NextResponse.json({ ok: true });
  }
  const email = String(body.email || request?.email || "").toLowerCase().trim();
  const name = String(body.name || request?.name || "");
  const organizationId = String(body.organizationId || request?.organizationId || "");
  const memberStateId = String(body.memberStateId || request?.memberStateId || "");
  const standardIds = Array.isArray(body.standardIds) ? body.standardIds.map((id: unknown) => String(id)) : [];
  try {
    await sendStandardRelease({
      email,
      name,
      organizationId,
      memberStateId,
      standardIds,
      requestId: request?.id,
      actorUserId: auth.session!.userId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send the standards";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (request) {
    await prisma.libraryStandardRequest.update({
      where: { id: request.id },
      data: { status: "SENT", reviewedById: auth.session!.userId, reviewedAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
}
