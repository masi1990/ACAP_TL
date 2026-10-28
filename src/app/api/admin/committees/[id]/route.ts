import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("standards:write");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json();
  const before = await prisma.technicalCommittee.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const code = body.code != null ? String(body.code).trim().toUpperCase() : undefined;
  const name = body.name != null ? String(body.name).trim() : undefined;
  const sectorId = body.sectorId != null ? String(body.sectorId).trim() : undefined;
  if (code === "" || name === "" || sectorId === "") {
    return NextResponse.json({ error: "sector, code, and name are required" }, { status: 400 });
  }
  if (sectorId) {
    const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
    if (!sector) return NextResponse.json({ error: "Choose a sector" }, { status: 400 });
  }
  if (code && code !== before.code) {
    const existing = await prisma.technicalCommittee.findUnique({ where: { code } });
    if (existing) return NextResponse.json({ error: "Committee code already exists" }, { status: 409 });
  }
  const row = await prisma.technicalCommittee.update({
    where: { id },
    data: { code, name, sectorId },
  });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "COMMITTEE_UPDATE",
    entityType: "TechnicalCommittee",
    entityId: id,
    before,
    after: row,
  });
  return NextResponse.json({ ok: true, row });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("standards:delete");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const before = await prisma.technicalCommittee.findUnique({
    where: { id },
    include: { _count: { select: { standards: true } } },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before._count.standards > 0) {
    return NextResponse.json({ error: "This committee still has standards. Move them first." }, { status: 409 });
  }
  await prisma.technicalCommittee.delete({ where: { id } });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "COMMITTEE_DELETE",
    entityType: "TechnicalCommittee",
    entityId: id,
    before,
  });
  return NextResponse.json({ ok: true });
}
