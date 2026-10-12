import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/audit";
import { sha256 } from "@/lib/auth";
import { requirePermission } from "@/lib/require-auth";

export async function POST(req: NextRequest) {
  const auth = await requirePermission("surveillance:operate");
  if (auth.error) return auth.error;

  const body = await req.json();
  const pinCode = String(body.pinCode || "").trim();
  const pin = pinCode
    ? await prisma.productPin.findUnique({ where: { pinCode }, include: { coc: true } })
    : null;
  if (pinCode && !pin) {
    return NextResponse.json({ error: "PIN not found" }, { status: 400 });
  }
  if (body.cascade && !pin) {
    return NextResponse.json({ error: "A PIN is required before a sanction can cascade" }, { status: 400 });
  }

  const surveillanceCase = await prisma.surveillanceCase.create({
    data: {
      pinId: pin?.id,
      title: String(body.title || "Surveillance case"),
      status: body.cascade ? "SANCTIONED" : "OPEN",
      summary: String(body.summary || body.title || "Market surveillance case"),
    },
  });

  if (body.cascade && pin) {
    await prisma.sanction.create({
      data: {
        caseId: surveillanceCase.id,
        level: "SUSPEND_PIN",
        cascadesTo: "PIN,COC,MARKS",
        notes: "Cascading sanction applied in pilot",
      },
    });
    await prisma.productPin.update({ where: { id: pin.id }, data: { status: "suspended" } });
    if (pin.cocId) {
      await prisma.coC.update({ where: { id: pin.cocId }, data: { status: "suspended" } });
      await prisma.markGrant.updateMany({
        where: { cocId: pin.cocId },
        data: { status: "SUSPENDED" },
      });
      const payloadHash = sha256(JSON.stringify({ pin: pin.pinCode, status: "suspended" }));
      await prisma.ledgerAnchor.create({
        data: {
          cocId: pin.cocId,
          eventType: "SANCTION_SUSPEND",
          payloadHash,
          blockRef: `stub-${payloadHash.slice(0, 12)}`,
          entityRef: pin.pinCode,
        },
      });
      await prisma.webhookOutbox.create({
        data: {
          eventType: "CertificateSuspended",
          payloadJson: JSON.stringify({ pin: pin.pinCode, certificateNo: pin.coc?.certificateNo }),
          targetHint: "COMESA",
        },
      });
    }
    await prisma.fraudAlert.create({
      data: {
        pinId: pin.id,
        kind: "MARK_MISUSE",
        message: "Cascading sanction triggered mark-misuse review.",
      },
    });
  }

  await appendAuditEvent({
    actorUserId: auth.session!.userId,
    action: "SURVEILLANCE_CASE",
    entityType: "SurveillanceCase",
    entityId: surveillanceCase.id,
    after: { cascade: !!body.cascade },
  });

  return NextResponse.json({
    message: body.cascade
      ? "Case opened with cascading PIN/CoC/mark suspension"
      : "Surveillance case opened",
  });
}
