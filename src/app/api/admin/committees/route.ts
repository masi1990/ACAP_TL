import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const auth = await requirePermission("standards:write");
  if (auth.error) return auth.error;
  const body = await req.json();
  const code = String(body.code || "").trim().toUpperCase();
  const name = String(body.name || "").trim();
  const sectorId = String(body.sectorId || "").trim();
  if (!code || !name || !sectorId) {
    return NextResponse.json({ error: "sector, code, and name are required" }, { status: 400 });
  }
  const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
  if (!sector) return NextResponse.json({ error: "Choose a sector" }, { status: 400 });
  const existing = await prisma.technicalCommittee.findUnique({ where: { code } });
  if (existing) return NextResponse.json({ error: "Committee code already exists" }, { status: 409 });
  const row = await prisma.technicalCommittee.create({ data: { code, name, sectorId } });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "COMMITTEE_CREATE",
    entityType: "TechnicalCommittee",
    entityId: row.id,
    after: row,
  });
  return NextResponse.json({ ok: true, row }, { status: 201 });
}
