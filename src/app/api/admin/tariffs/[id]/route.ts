import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

function normalizeCode(display: string) {
  return display.replace(/[.\s]/g, "");
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("tariffs:write");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const body = await req.json();
  const before = await prisma.tariffLine.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const codeDisplay = body.codeDisplay != null ? String(body.codeDisplay).trim() : undefined;
  const codeNormalized = codeDisplay ? normalizeCode(codeDisplay) : undefined;

  const row = await prisma.tariffLine.update({
    where: { id },
    data: {
      codeDisplay,
      codeNormalized,
      codeLength: codeNormalized?.length,
      hsHeading: codeNormalized?.slice(0, 4),
      description: body.description != null ? String(body.description).trim() : undefined,
      parentTariffLineId: body.parentTariffLineId === undefined ? undefined : body.parentTariffLineId || null,
      effectiveTo: body.effectiveTo === undefined ? undefined : body.effectiveTo ? new Date(body.effectiveTo) : null,
    },
  });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "TARIFF_UPDATE",
    entityType: "TariffLine",
    entityId: id,
    before: before,
    after: row,
  });
  return NextResponse.json({ ok: true, row });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("tariffs:delete");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const before = await prisma.tariffLine.findUnique({
    where: { id },
    include: { _count: { select: { maps: true, products: true, children: true } } },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before._count.maps || before._count.products || before._count.children) {
    return NextResponse.json(
      { error: "Tariff is linked to maps, products, or child codes — unlink first" },
      { status: 409 },
    );
  }
  await prisma.tariffLine.delete({ where: { id } });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "TARIFF_DELETE",
    entityType: "TariffLine",
    entityId: id,
    before: before,
  });
  return NextResponse.json({ ok: true });
}
