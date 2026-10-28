import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, SESSION_COOKIE_MAX_AGE_S, createSession, verifyPassword } from "@/lib/auth";
import { appendAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body.email || "").toLowerCase().trim();
  const password = String(body.password || "");
  const user = await prisma.userAccount.findUnique({ where: { email } });
  if (user?.mustChangePassword) {
    return NextResponse.json(
      { error: "Set a password from the link sent to you before you sign in" },
      { status: 403 },
    );
  }
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  if (!user.emailVerified) {
    // stub: auto-verify on first successful login for pilot
    await prisma.userAccount.update({ where: { id: user.id }, data: { emailVerified: true } });
  }
  const session = await createSession(user.id);
  await appendAuditEvent({
    actorUserId: user.id,
    action: "LOGIN",
    entityType: "UserAccount",
    entityId: user.id,
  });
  const res = NextResponse.json({ ok: true, email: user.email });
  res.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_S,
  });
  return res;
}
