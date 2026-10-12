import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("recs:write");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json();
  const before = await prisma.rec.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const row = await prisma.rec.update({
    where: { id },
    data: {
      code: body.code != null ? String(body.code).trim().toUpperCase() : undefined,
      name: body.name != null ? String(body.name).trim() : undefined,
    },
  });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "REC_UPDATE",
    entityType: "Rec",
    entityId: id,
    before: before,
    after: row,
  });
  return NextResponse.json({ ok: true, row });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("recs:delete");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const before = await prisma.rec.findUnique({
    where: { id },
    include: { _count: { select: { tariffLines: true } } },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before._count.tariffLines > 0) {
    return NextResponse.json(
      { error: "Delete tariff lines for this REC first (least-privilege cascade block)" },
      { status: 409 },
    );
  }
  await prisma.rec.delete({ where: { id } });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "REC_DELETE",
    entityType: "Rec",
    entityId: id,
    before: before,
  });
  return NextResponse.json({ ok: true });
}
