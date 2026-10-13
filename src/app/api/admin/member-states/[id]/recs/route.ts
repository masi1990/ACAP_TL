import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

/** Replace the RECs a country belongs to. A country may belong to more than one. */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requirePermission("institutions:write");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const state = await prisma.memberState.findUnique({ where: { id } });
  if (!state) return NextResponse.json({ error: "Country not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (!Array.isArray(body.recIds)) {
    return NextResponse.json({ error: "Choose the RECs for this country" }, { status: 400 });
  }
  const raw: unknown[] = body.recIds;
  const recIds: string[] = [...new Set(raw.map((value) => String(value).trim()).filter((value) => value.length > 0))];
  const recs = await prisma.rec.findMany({ where: { id: { in: recIds } } });
  if (recs.length !== recIds.length) {
    return NextResponse.json({ error: "Choose RECs from the list" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.memberStateRec.deleteMany({ where: { memberStateId: id } }),
    ...(recIds.length
      ? [prisma.memberStateRec.createMany({ data: recIds.map((recId) => ({ memberStateId: id, recId })) })]
      : []),
  ]);

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "COUNTRY_RECS_UPDATE",
    entityType: "MemberState",
    entityId: id,
    after: { recIds },
  });
  return NextResponse.json({ ok: true });
}
