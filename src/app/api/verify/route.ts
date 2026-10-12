import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const pinCode = (req.nextUrl.searchParams.get("pin") || "").trim();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const rl = await checkRateLimit(`verify:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
  }
  if (!pinCode) {
    return NextResponse.json({ ok: false, error: "PIN required" }, { status: 400 });
  }
  const pin = await prisma.productPin.findUnique({
    where: { pinCode },
    include: {
      variant: { include: { product: { include: { company: true } } } },
      coc: { include: { ledgerAnchors: { orderBy: { anchoredAt: "desc" }, take: 1 } } },
    },
  });
  if (!pin) {
    return NextResponse.json({ ok: false, error: "PIN not found" }, { status: 404 });
  }
  const ledger = pin.coc?.ledgerAnchors[0];
  return NextResponse.json({
    ok: true,
    pin: {
      pinCode: pin.pinCode,
      status: pin.status,
      issuedAt: pin.issuedAt?.toISOString(),
      expiresAt: pin.expiresAt?.toISOString(),
      product: pin.variant.product.name,
      company: pin.variant.product.company.legalName,
      certificateNo: pin.coc?.certificateNo,
      markScheme: pin.coc?.markScheme,
      ledger: ledger
        ? { payloadHash: ledger.payloadHash, blockRef: ledger.blockRef }
        : undefined,
    },
  });
}
