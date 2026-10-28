import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/audit";
import { createAuthorityAccount } from "@/lib/institution-account";
import { requirePermission } from "@/lib/require-auth";

type Ctx = { params: Promise<{ id: string }> };

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("institutions:write");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const decision = String(body.decision || "");
  if (decision !== "approve" && decision !== "reject") return fail("Choose approve or reject");

  const request = await prisma.institutionRequest.findUnique({ where: { id } });
  if (!request) return fail("Request not found", 404);
  if (request.status !== "PENDING") return fail("This request has already been decided");

  if (decision === "reject") {
    await prisma.institutionRequest.update({
      where: { id },
      data: { status: "REJECTED", reviewedById: auth.session!.userId, reviewedAt: new Date() },
    });
    await appendAuditEvent({
      actorUserId: auth.session!.userId,
      action: "INSTITUTION_REQUEST_REJECT",
      entityType: "InstitutionRequest",
      entityId: id,
      after: { name: request.name, type: request.type },
    });
    return NextResponse.json({ ok: true });
  }

  try {
    const org = await createAuthorityAccount({
      name: request.name,
      type: request.type,
      memberStateId: request.memberStateId,
      adminUserId: request.userId,
      grantedById: auth.session!.userId,
    });
    await prisma.institutionRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedById: auth.session!.userId,
        reviewedAt: new Date(),
        organizationId: org.id,
      },
    });
    await appendAuditEvent({
      actorUserId: auth.session!.userId,
      action: "INSTITUTION_CREATE",
      entityType: "Organization",
      entityId: org.id,
      organizationId: org.id,
      after: { name: org.name, type: org.type, fromRequest: id },
    });
    return NextResponse.json({ ok: true, id: org.id });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "The institution could not be created");
  }
}
