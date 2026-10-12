import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, startImpersonation } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json();
  const target = await prisma.userAccount.findUnique({
    where: { email: String(body.targetEmail || "").toLowerCase() },
  });
  if (!target) return NextResponse.json({ error: "Target user not found" }, { status: 404 });
  try {
    await startImpersonation(session.userId, target.id, String(body.reason || ""));
    return NextResponse.json({
      message: `Now impersonating ${target.email}. Banner/audit active; 10-minute idle still applies.`,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 403 });
  }
}
