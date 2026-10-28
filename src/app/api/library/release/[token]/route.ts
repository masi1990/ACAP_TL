import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, SESSION_COOKIE_MAX_AGE_S, createSession, hashPassword } from "@/lib/auth";
import { appendAuditEvent } from "@/lib/audit";
import { appointStandardsOfficer, logLibraryActivity } from "@/lib/library";

type Ctx = { params: Promise<{ token: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const release = await prisma.libraryRelease.findUnique({ where: { token } });
  if (!release) return NextResponse.json({ error: "This link is not valid" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const password = String(body.password || "");
  if (!name) return NextResponse.json({ error: "Enter your name" }, { status: 400 });
  if (password.length < 8) {
    return NextResponse.json({ error: "Choose a password of at least 8 characters" }, { status: 400 });
  }
  const existing = await prisma.userAccount.findUnique({ where: { email: release.email } });
  if (existing) {
    return NextResponse.json({ error: "This email already has an account. Sign in." }, { status: 409 });
  }
  const user = await prisma.userAccount.create({
    data: { email: release.email, name, passwordHash: await hashPassword(password), emailVerified: true },
  });
  await prisma.libraryRelease.update({ where: { id: release.id }, data: { userId: user.id } });
  await appointStandardsOfficer({
    userId: user.id,
    organizationId: release.organizationId,
    memberStateId: release.memberStateId,
    grantedById: user.id,
    scope: "RELEASE",
  });
  await logLibraryActivity({
    userId: user.id,
    organizationId: release.organizationId,
    memberStateId: release.memberStateId,
    action: "ACCOUNT_CREATED",
    detail: "From a standards release",
  });
  await appendAuditEvent({
    actorUserId: user.id,
    action: "LIBRARY_ACCOUNT_REGISTER",
    entityType: "UserAccount",
    entityId: user.id,
    organizationId: release.organizationId,
  });
  const session = await createSession(user.id);
  const res = NextResponse.json({
    ok: true,
    next: `/library/request?organizationId=${release.organizationId}&memberStateId=${release.memberStateId}`,
  });
  res.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_S,
  });
  return res;
}
