import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { appendAuditEvent } from "@/lib/audit";

export async function POST() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const clients = await prisma.clientAccount.findMany({ take: 2 });
  const products = await prisma.product.findMany({ select: { id: true }, take: 5 });
  const row = await prisma.portfolioTransfer.create({
    data: {
      fromClientId: clients[0]?.id || "unknown",
      toClientId: clients[1]?.id || clients[0]?.id || "unknown",
      productIdsJson: JSON.stringify(products.map((p) => p.id)),
      status: "STUB_PENDING",
      reason: "Demo portfolio transfer request (no ownership mutation in stub)",
    },
  });
  await appendAuditEvent({
    actorUserId: session.userId,
    action: "PORTFOLIO_TRANSFER_STUB",
    entityType: "PortfolioTransfer",
    entityId: row.id,
  });
  return NextResponse.json({ message: `Portfolio transfer stub recorded (${row.id})` });
}
