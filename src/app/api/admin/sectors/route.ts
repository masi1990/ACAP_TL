import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";

export async function GET() {
  const auth = await requirePermission("standards:read");
  if (auth.error) return auth.error;
  const [rows, memberStates] = await Promise.all([
    prisma.sector.findMany({
      include: {
        committees: {
          include: { _count: { select: { standards: true } } },
          orderBy: { code: "asc" },
        },
      },
      orderBy: { code: "asc" },
    }),
    prisma.memberState.findMany({ orderBy: { name: "asc" } }),
  ]);
  return NextResponse.json({ ok: true, rows, memberStates });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("standards:write");
  if (auth.error) return auth.error;
  const body = await req.json();
  const code = String(body.code || "").trim().toUpperCase();
  const name = String(body.name || "").trim();
  if (!code || !name) {
    return NextResponse.json({ error: "code and name are required" }, { status: 400 });
  }
  const existing = await prisma.sector.findUnique({ where: { code } });
  if (existing) return NextResponse.json({ error: "Sector code already exists" }, { status: 409 });
  const row = await prisma.sector.create({ data: { code, name } });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "SECTOR_CREATE",
    entityType: "Sector",
    entityId: row.id,
    after: row,
  });
  return NextResponse.json({ ok: true, row }, { status: 201 });
}
