import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";

const CURRENCIES = ["USD", "EUR", "KES", "UGX", "TZS", "RWF", "ZAR", "NGN", "GHS", "XOF", "XAF"];

export async function POST(req: NextRequest) {
  const auth = await requirePermission("standards:write");
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const standardVersionId = String(body.standardVersionId || "").trim();
  const currency = String(body.currency || "USD").trim().toUpperCase();
  const listed = body.active === true || body.active === "true";
  const amount = Number(body.amount);

  if (!standardVersionId) return NextResponse.json({ error: "Choose a standard" }, { status: 400 });
  if (!CURRENCIES.includes(currency)) return NextResponse.json({ error: "Choose a currency" }, { status: 400 });
  if (listed && (!Number.isFinite(amount) || amount <= 0)) {
    return NextResponse.json({ error: "Enter a price greater than zero before listing this standard" }, { status: 400 });
  }

  const version = await prisma.standardVersion.findUnique({
    where: { id: standardVersionId },
    include: { standard: true, catalogItem: true },
  });
  if (!version) return NextResponse.json({ error: "Standard not found" }, { status: 404 });

  const priceCents = Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : 0;
  const coverTitle = `${version.editionLabel} ${version.standard.titleEn}`.trim();

  if (!listed && priceCents === 0) {
    if (version.catalogItem) {
      await prisma.catalogItem.update({
        where: { id: version.catalogItem.id },
        data: { active: false },
      });
    }
  } else if (version.catalogItem) {
    await prisma.catalogItem.update({
      where: { id: version.catalogItem.id },
      data: { priceCents: priceCents || version.catalogItem.priceCents, currency, active: listed, coverTitle },
    });
  } else if (priceCents > 0) {
    await prisma.catalogItem.create({
      data: {
        standardVersionId: version.id,
        priceCents,
        currency,
        coverTitle,
        previewScopeOnly: true,
        active: listed,
      },
    });
  }

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "STANDARD_PRICE",
    entityType: "StandardVersion",
    entityId: version.id,
    after: { priceCents, currency, active: listed, designation: version.standard.designation },
  });

  return NextResponse.json({ ok: true });
}
