import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { describeImportedPin, markSchemeLabel, normalizePinInput, registryStatus } from "@/lib/imported-marks";

export async function GET(req: NextRequest) {
  const pinCode = normalizePinInput(req.nextUrl.searchParams.get("pin") || "");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const rl = await checkRateLimit(`verify:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
  }
  if (!pinCode) {
    return NextResponse.json({ ok: false, error: "PIN required" }, { status: 400 });
  }
  const imported = await describeImportedPin(pinCode);
  if (imported) {
    const { mark, removed } = imported;
    if (removed) {
      return NextResponse.json({
        ok: true,
        underReview: true,
        message: "This product is currently under review.",
        pin: {
          pinCode: mark.pinText,
          status: "under_review",
          product: mark.productName,
          brand: mark.brand.trim() || undefined,
          company: mark.companyName,
        },
      });
    }
    return NextResponse.json({
      ok: true,
      pin: {
        pinCode: mark.pinText,
        status: registryStatus(mark.markStatus),
        issuedAt: mark.issuedAt?.toISOString(),
        expiresAt: mark.expiresAt?.toISOString(),
        product: mark.productName,
        brand: mark.brand.trim() || undefined,
        company: mark.companyName,
        certificateNo: mark.certificationId,
        markScheme: markSchemeLabel(mark.markType),
        certificates: [
          {
            certificateNo: mark.certificationId,
            markScheme: markSchemeLabel(mark.markType),
            status: registryStatus(mark.markStatus),
            standard: mark.standardVersion?.standard.designation || mark.sourceStandardText || "Standard not linked yet",
          },
        ],
      },
    });
  }
  const pin = await prisma.productPin.findUnique({
    where: { pinCode },
    include: {
      variant: {
        include: {
          product: {
            include: {
              company: true,
              applications: { include: { coc: true, standardVersion: { include: { standard: true } } } },
            },
          },
        },
      },
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
      certificates: pin.variant.product.applications
        .filter((row) => row.coc)
        .map((row) => ({
          certificateNo: row.coc!.certificateNo,
          markScheme: row.markScheme,
          status: row.coc!.status,
          standard: row.standardVersion.standard.designation,
        })),
      ledger: ledger
        ? { payloadHash: ledger.payloadHash, blockRef: ledger.blockRef }
        : undefined,
    },
  });
}
