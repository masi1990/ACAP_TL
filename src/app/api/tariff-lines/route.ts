import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Public catalog of tariff lines for the lookup dropdown */
export async function GET(req: NextRequest) {
  const rec = (req.nextUrl.searchParams.get("rec") || "").toUpperCase();
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();

  const lines = await prisma.tariffLine.findMany({
    where: rec ? { rec: { code: rec } } : undefined,
    include: { rec: true },
    orderBy: [{ codeLength: "asc" }, { codeNormalized: "asc" }],
  });

  const filtered = lines.filter((l) => {
    if (!q) return true;
    const hay = `${l.codeDisplay} ${l.codeNormalized} ${l.description} ${l.rec.code}`.toLowerCase();
    return hay.includes(q) || hay.replace(/\./g, "").includes(q.replace(/\./g, ""));
  });

  return NextResponse.json({
    ok: true,
    count: filtered.length,
    lines: filtered.map((l) => ({
      id: l.id,
      rec: l.rec.code,
      codeDisplay: l.codeDisplay,
      codeNormalized: l.codeNormalized,
      codeLength: l.codeLength,
      description: l.description,
    })),
  });
}
