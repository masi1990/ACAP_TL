import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

/** REST verify/lookup for single-window adapters */
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "adapter";
  const rl = await checkRateLimit(`adapter-verify:${ip}`, 120, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const pin = req.nextUrl.searchParams.get("pin");
  const certificateNo = req.nextUrl.searchParams.get("certificateNo");
  if (!pin && !certificateNo) {
    return NextResponse.json({ error: "pin or certificateNo required" }, { status: 400 });
  }

  if (pin) {
    const row = await prisma.productPin.findUnique({
      where: { pinCode: pin },
      include: {
        coc: true,
        variant: { include: { product: { include: { company: true, standardLinks: true } } } },
      },
    });
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({
      schema: "acap-tl.conformity-block.v1",
      pin: row.pinCode,
      status: row.status,
      certificateNo: row.coc?.certificateNo,
      markScheme: row.coc?.markScheme,
      product: row.variant.product.name,
      company: row.variant.product.company.legalName,
      standardIds: row.variant.product.standardLinks.map((s) => s.standardVersionId),
      asOf: new Date().toISOString(),
    });
  }

  const coc = await prisma.coC.findUnique({
    where: { certificateNo: certificateNo! },
    include: { pins: true, application: { include: { product: true } } },
  });
  if (!coc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    schema: "acap-tl.conformity-block.v1",
    certificateNo: coc.certificateNo,
    status: coc.status,
    pins: coc.pins.map((p) => ({ pin: p.pinCode, status: p.status })),
    productId: coc.application.productId,
    asOf: new Date().toISOString(),
  });
}
