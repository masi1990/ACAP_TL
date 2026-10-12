import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveTariffStandardsPack } from "@/lib/tariff";

const SUPPORTED = ["EAC", "ECOWAS", "COMESA"] as const;

/** Reference adapter stubs for REC single windows */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ rec: string }> },
) {
  const { rec: raw } = await ctx.params;
  const rec = raw.toUpperCase();
  if (!SUPPORTED.includes(rec as (typeof SUPPORTED)[number])) {
    return NextResponse.json(
      { error: `Adapter stub supports ${SUPPORTED.join(", ")} only` },
      { status: 404 },
    );
  }

  const code = req.nextUrl.searchParams.get("tariff") || "1006.30";
  const pack = await resolveTariffStandardsPack(rec === "ECOWAS" && code === "1006.30" ? "ECOWAS" : rec, code === "1006.30" && rec === "ECOWAS" ? "1006.30.00" : code);

  const pending = await prisma.webhookOutbox.findMany({
    where: { OR: [{ targetHint: rec }, { targetHint: null }], status: "PENDING" },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    adapter: rec,
    mode: "reference_stub",
    mapping: "WCO-DM-inspired conformity information utility block",
    tariffLookup: pack,
    outboxPreview: pending.map((p) => ({
      id: p.id,
      eventType: p.eventType,
      createdAt: p.createdAt,
    })),
    notes:
      "Does not replace national single windows. Hub remains authoritative; adapter translates events outbound.",
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ rec: string }> },
) {
  const { rec: raw } = await ctx.params;
  const rec = raw.toUpperCase();
  const body = await req.json().catch(() => ({}));
  const delivered = await prisma.webhookOutbox.updateMany({
    where: { status: "PENDING", OR: [{ targetHint: rec }, { targetHint: null }] },
    data: { status: "DELIVERED", deliveredAt: new Date(), attempts: { increment: 1 } },
  });
  return NextResponse.json({
    adapter: rec,
    action: body.action || "drain_outbox",
    delivered: delivered.count,
  });
}
