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
  const before = await prisma.sector.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const code = body.code != null ? String(body.code).trim().toUpperCase() : undefined;
  const name = body.name != null ? String(body.name).trim() : undefined;
  if (code === "" || name === "") {
    return NextResponse.json({ error: "code and name are required" }, { status: 400 });
  }
  if (code && code !== before.code) {
    const existing = await prisma.sector.findUnique({ where: { code } });
    if (existing) return NextResponse.json({ error: "Sector code already exists" }, { status: 409 });
  }
  const row = await prisma.sector.update({ where: { id }, data: { code, name } });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "SECTOR_UPDATE",
    entityType: "Sector",
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
  const before = await prisma.sector.findUnique({
    where: { id },
    include: { _count: { select: { committees: true } } },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before._count.committees > 0) {
    return NextResponse.json({ error: "Delete this sector's technical committees first" }, { status: 409 });
  }
  await prisma.sector.delete({ where: { id } });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "SECTOR_DELETE",
    entityType: "Sector",
    entityId: id,
    before,
  });
  return NextResponse.json({ ok: true });
}
