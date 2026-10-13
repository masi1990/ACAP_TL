import { cache } from "react";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { appendAuditEvent } from "./audit";
import { can, isArsoAdmin } from "./rbac";

export const IDLE_MS = 10 * 60 * 1000;
/** Cookie may outlive idle; idle is enforced via Session.expiresAt in the DB. */
export const SESSION_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 7;
export const SESSION_COOKIE = "acap_session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, opts?: { impersonatorId?: string; reason?: string }) {
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const session = await prisma.session.create({
    data: {
      userId,
      token,
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + IDLE_MS),
      impersonatorId: opts?.impersonatorId,
      impersonationReason: opts?.reason,
    },
  });
  // Cookie writes are only legal in Route Handlers / Server Actions (login, logout, etc.).
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_S,
  });
  return session;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
    jar.delete(SESSION_COOKIE);
  }
}

/**
 * Read the current session. Safe to call from Server Components:
 * only reads cookies and updates DB activity — never mutates the cookie jar.
 */
export const getSessionUser = cache(async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          memberships: { include: { organization: true } },
          roleAssignments: { include: { role: true } },
        },
      },
    },
  });
  if (!session) return null;
  const now = new Date();
  if (session.expiresAt < now) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    // Stale cookie is left in place; RSC cannot delete it. Logout / next login clears it.
    return null;
  }
  // Sliding idle window (DB only — cookie maxAge is not refreshed from RSC)
  await prisma.session.update({
    where: { id: session.id },
    data: {
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + IDLE_MS),
    },
  });
  await prisma.userAccount.update({
    where: { id: session.userId },
    data: { lastActiveAt: now },
  });
  return session;
});

export async function startImpersonation(supportUserId: string, targetUserId: string, reason: string) {
  const support = await prisma.userAccount.findUnique({
    where: { id: supportUserId },
    include: {
      memberships: { include: { organization: true } },
      roleAssignments: { include: { role: true } },
    },
  });
  if (!support || !can(support, "impersonate")) {
    throw new Error("Impersonation not permitted");
  }
  if (!reason.trim()) throw new Error("Reason required");
  const target = await prisma.userAccount.findUnique({
    where: { id: targetUserId },
    include: { roleAssignments: { select: { roleCode: true } } },
  });
  if (!target) throw new Error("Target not found");
  if (isArsoAdmin(target) && support.id !== target.id) {
    throw new Error("Cannot impersonate ARSO super-admins");
  }
  await destroySession();
  const session = await createSession(target.id, { impersonatorId: support.id, reason });
  await appendAuditEvent({
    actorUserId: target.id,
    impersonatorId: support.id,
    action: "IMPERSONATION_START",
    entityType: "UserAccount",
    entityId: target.id,
    reason,
  });
  return session;
}

export function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}
