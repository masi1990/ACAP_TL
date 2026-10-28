import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, SESSION_COOKIE_MAX_AGE_S, createSession, hashPassword } from "@/lib/auth";
import { appendAuditEvent } from "@/lib/audit";
import { logLibraryActivity } from "@/lib/library";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();
  const name = String(body.name || "").trim();
  const password = String(body.password || "");
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter an email address" }, { status: 400 });
  }
  if (!name) return NextResponse.json({ error: "Enter your name" }, { status: 400 });
  if (password.length < 8) {
    return NextResponse.json({ error: "Choose a password of at least 8 characters" }, { status: 400 });
  }
  const existing = await prisma.userAccount.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists. Sign in." }, { status: 409 });
  }
  const user = await prisma.userAccount.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      emailVerified: true,
    },
  });
  await logLibraryActivity({ userId: user.id, roleCode: "", action: "ACCOUNT_CREATED", detail: email });
  await appendAuditEvent({
    actorUserId: user.id,
    action: "LIBRARY_ACCOUNT_REGISTER",
    entityType: "UserAccount",
    entityId: user.id,
  });
  const session = await createSession(user.id);
  const res = NextResponse.json({ ok: true, next: "/library/request" });
  res.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_S,
  });
  return res;
}
