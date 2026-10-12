import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/require-auth";
import { appendAuditEvent } from "@/lib/audit";

function normalizeCode(display: string) {
  return display.replace(/[.\s]/g, "");
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission("tariffs:read");
  if (auth.error) return auth.error;
  const rec = req.nextUrl.searchParams.get("rec")?.toUpperCase();
  const rows = await prisma.tariffLine.findMany({
    where: rec ? { rec: { code: rec } } : undefined,
    include: { rec: true },
    orderBy: [{ codeLength: "asc" }, { codeNormalized: "asc" }],
  });
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("tariffs:write");
  if (auth.error) return auth.error;
  const body = await req.json();
  const recCode = String(body.recCode || "").trim().toUpperCase();
  const codeDisplay = String(body.codeDisplay || "").trim();
  const description = String(body.description || "").trim();
  if (!recCode || !codeDisplay || !description) {
    return NextResponse.json({ error: "recCode, codeDisplay, and description are required" }, { status: 400 });
  }
  const rec = await prisma.rec.findUnique({ where: { code: recCode } });
  if (!rec) return NextResponse.json({ error: "REC not found — create the REC first" }, { status: 400 });

  const codeNormalized = normalizeCode(codeDisplay);
  const codeLength = codeNormalized.length;
  const hsHeading = codeNormalized.slice(0, 4);
  const effectiveFrom = body.effectiveFrom ? new Date(body.effectiveFrom) : new Date();

  const row = await prisma.tariffLine.create({
    data: {
      id: `tl-${rec.code.toLowerCase()}-${codeNormalized}-${randomBytes(2).toString("hex")}`,
      recId: rec.id,
      codeDisplay,
      codeNormalized,
      codeLength,
      parentTariffLineId: body.parentTariffLineId || null,
      hsHeading,
      description,
      effectiveFrom,
      effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
    },
  });
  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "TARIFF_CREATE",
    entityType: "TariffLine",
    entityId: row.id,
    after: row,
  });
  return NextResponse.json({ ok: true, row }, { status: 201 });
}
