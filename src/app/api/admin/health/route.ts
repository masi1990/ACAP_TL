import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { canOpenAdmin } from "@/lib/navigation";
import { collectServerHealth } from "@/lib/server-health-collect";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canOpenAdmin(session.user) || !can(session.user, "audit:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const report = await collectServerHealth();
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "Health collection failed" }, { status: 500 });
  }
}
