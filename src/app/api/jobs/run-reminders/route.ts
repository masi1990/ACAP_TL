import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { appendAuditEvent } from "@/lib/audit";
import { dispatchDueNotifications } from "@/lib/notifications";

/** Send notification jobs whose scheduled time has arrived. */
export async function POST() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const result = await dispatchDueNotifications();
  await appendAuditEvent({
    actorUserId: session.userId,
    action: "NOTIFICATIONS_DISPATCHED",
    entityType: "NotificationJob",
    entityId: "batch",
    after: result,
  });
  if (!result.configured) {
    return NextResponse.json({
      message: "Mail is not configured. Due notifications stay pending until Workspace SMTP is set.",
      ...result,
    });
  }
  return NextResponse.json({
    message: `Sent ${result.sent} notification(s). ${result.failed} failed.`,
    ...result,
  });
}
