import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { appendAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const pinCode = String(body.pinCode || "").trim();
  let pin = pinCode
    ? await prisma.productPin.findUnique({
        where: { pinCode },
        include: { coc: { include: { application: true } } },
      })
    : null;

  const routedCbId = pin?.coc?.application.organizationId ?? null;
  const complaint = await prisma.consumerComplaint.create({
    data: {
      pinId: pin?.id,
      complainantEmail: String(body.complainantEmail || "anonymous@example.com"),
      subject: String(body.subject || "Complaint"),
      body: String(body.body || ""),
      status: "OPEN",
      routedCbId,
    },
  });
  await appendAuditEvent({
    action: "CONSUMER_COMPLAINT",
    entityType: "ConsumerComplaint",
    entityId: complaint.id,
    organizationId: routedCbId,
  });
  return NextResponse.json({
    message: `Complaint filed and routed to CB ${routedCbId}`,
  });
}
