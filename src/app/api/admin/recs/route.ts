import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";

export async function GET() {
  const auth = await requirePermission("recs:read");
  if (auth.error) return auth.error;
  const rows = await prisma.rec.findMany({
    include: { _count: { select: { tariffLines: true } } },
    orderBy: { code: "asc" },
  });
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("recs:write");
  if (auth.error) return auth.error;
  const body = await req.json();
  const code = String(body.code || "")
    .trim()
    .toUpperCase();
  const name = String(body.name || "").trim();
  if (!code || !name) {
    return NextResponse.json({ error: "code and name are required" }, { status: 400 });
  }
  const existing = await prisma.rec.findUnique({ where: { code } });
  if (existing) return NextResponse.json({ error: "REC code already exists" }, { status: 409 });

  const row = await prisma.rec.create({
    data: { id: `rec-${code.toLowerCase()}-${randomBytes(2).toString("hex")}`, code, name },
  });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "REC_CREATE",
    entityType: "Rec",
    entityId: row.id,
    after: row,
  });
  return NextResponse.json({ ok: true, row }, { status: 201 });
}
