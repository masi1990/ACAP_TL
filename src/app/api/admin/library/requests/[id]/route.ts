import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";
import { appointStandardsOfficer, logLibraryActivity, notifyStandardsOfficer } from "@/lib/library";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("institutions:write");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const decision = String(body.decision || "");
  const request = await prisma.libraryAccessRequest.findUnique({
    where: { id },
    include: { user: true, organization: true },
  });
  if (!request || request.status !== "PENDING") {
    return NextResponse.json({ error: "That request is no longer pending" }, { status: 400 });
  }
  if (decision === "reject") {
    await prisma.libraryAccessRequest.update({
      where: { id },
      data: { status: "REJECTED", reviewedById: auth.session!.userId, reviewedAt: new Date() },
    });
    await logLibraryActivity({
      userId: request.userId,
      organizationId: request.organizationId,
      memberStateId: request.memberStateId,
      action: "ROLE_REJECTED",
    });
    await appendAuditEvent({
      actorUserId: auth.session!.userId,
      action: "LIBRARY_ROLE_REJECT",
      entityType: "LibraryAccessRequest",
      entityId: id,
      organizationId: request.organizationId,
    });
    return NextResponse.json({ ok: true });
  }
  if (decision !== "approve") return NextResponse.json({ error: "Choose approve or reject" }, { status: 400 });
  try {
    await appointStandardsOfficer({
      userId: request.userId,
      organizationId: request.organizationId,
      memberStateId: request.memberStateId,
      grantedById: auth.session!.userId,
      scope: "FULL",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not grant access";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  await prisma.libraryAccessRequest.update({
    where: { id },
    data: { status: "APPROVED", reviewedById: auth.session!.userId, reviewedAt: new Date() },
  });
  await notifyStandardsOfficer(request.user, request.organization.name);
  await logLibraryActivity({
    userId: request.userId,
    organizationId: request.organizationId,
    memberStateId: request.memberStateId,
    action: "ROLE_ASSIGNED",
    detail: "Approved request",
  });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "LIBRARY_ROLE_GRANT",
    entityType: "LibraryAccessRequest",
    entityId: id,
    organizationId: request.organizationId,
  });
  return NextResponse.json({ ok: true });
}
