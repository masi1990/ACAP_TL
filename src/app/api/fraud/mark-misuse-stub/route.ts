import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { appendAuditEvent } from "@/lib/audit";

export async function POST() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const pin = await prisma.productPin.findFirst();
  const alert = await prisma.fraudAlert.create({
    data: {
      pinId: pin?.id,
      kind: "MARK_MISUSE",
      message:
        "Stub alert: Quality Mark observed on unregistered packaging lot at Namanga market survey.",
      status: "OPEN",
    },
  });
  await appendAuditEvent({
    actorUserId: session.userId,
    action: "FRAUD_ALERT_STUB",
    entityType: "FraudAlert",
    entityId: alert.id,
  });
  return NextResponse.json({ message: "Mark-misuse alert stub created" });
}
