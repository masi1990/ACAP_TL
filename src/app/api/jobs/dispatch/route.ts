import { NextRequest, NextResponse } from "next/server";
import { dispatchDueNotifications } from "@/lib/notifications";

/** External scheduler entry. Requires Authorization: Bearer CRON_SECRET. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Dispatcher secret is not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatchDueNotifications();
  return NextResponse.json(result);
}
