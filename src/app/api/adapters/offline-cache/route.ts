import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/db";

const SECRET = process.env.OFFLINE_CACHE_SECRET || "acap-tl-offline-dev-secret";

function sign(payload: string) {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

/** Build signed last-known status profile for border offline use */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const entryPointCode = String(body.entryPointCode || "KE-NAMANGA");
  const pinCode = String(body.pinCode || "");
  const pin = pinCode
    ? await prisma.productPin.findUnique({ where: { pinCode }, include: { coc: true } })
    : await prisma.productPin.findFirst({ include: { coc: true } });
  if (!pin) return NextResponse.json({ error: "No PIN to cache" }, { status: 404 });

  const asOf = new Date();
  const statusJson = JSON.stringify({
    pin: pin.pinCode,
    status: pin.status,
    certificateNo: pin.coc?.certificateNo,
    cocStatus: pin.coc?.status,
    asOf: asOf.toISOString(),
  });
  const signature = sign(statusJson);
  const profile = await prisma.offlineCacheProfile.create({
    data: {
      entryPointCode,
      pinCode: pin.pinCode,
      statusJson,
      asOf,
      signature,
    },
  });

  return NextResponse.json({
    message: "Signed offline cache profile created",
    profile: {
      id: profile.id,
      entryPointCode,
      status: JSON.parse(statusJson),
      signature,
      conflictRule: "Hub primary wins; offline allow never overrides newer hub suspended/withdrawn/expired",
    },
  });
}

export async function GET(req: NextRequest) {
  const entryPointCode = req.nextUrl.searchParams.get("entryPoint") || "KE-NAMANGA";
  const rows = await prisma.offlineCacheProfile.findMany({
    where: { entryPointCode },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({
    entryPointCode,
    profiles: rows.map((r) => ({
      pinCode: r.pinCode,
      asOf: r.asOf,
      signatureValid: sign(r.statusJson) === r.signature,
      status: JSON.parse(r.statusJson),
    })),
  });
}
