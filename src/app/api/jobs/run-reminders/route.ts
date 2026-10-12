import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { appendAuditEvent } from "@/lib/audit";

/** Simulate sending due expiry reminder jobs */
export async function POST() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const due = await prisma.notificationJob.findMany({
    where: { status: "PENDING", scheduledFor: { lte: new Date(Date.now() + 200 * 86400000) } },
    include: { coc: true },
    take: 20,
  });
  let sent = 0;
  for (const job of due) {
    await prisma.notificationJob.update({
      where: { id: job.id },
      data: { status: "SENT", sentAt: new Date() },
    });
    sent += 1;
  }
  await appendAuditEvent({
    actorUserId: session.userId,
    action: "EXPIRY_REMINDERS_SIMULATED",
    entityType: "NotificationJob",
    entityId: "batch",
    after: { sent },
  });
  return NextResponse.json({
    message: `Simulated email delivery for ${sent} reminder(s) (6/4/3/2/1-month schedule).`,
  });
}
