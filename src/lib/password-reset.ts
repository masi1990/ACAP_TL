import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { hashPassword, sha256 } from "@/lib/auth";
import { notifyAfterCommit, queuePasswordReset } from "@/lib/notifications";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function issuePasswordReset(user: { id: string; email: string; name: string }) {
  const raw = randomBytes(24).toString("hex");
  const row = await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + DAY_MS),
    },
  });
  await queuePasswordReset({ resetId: row.id, email: user.email, name: user.name, token: raw });
  const base = (process.env.APP_BASE_URL?.trim() || "http://127.0.0.1:43123").replace(/\/$/, "");
  return { url: `${base}/en/reset-password?token=${raw}` };
}

export async function consumePasswordReset(token: string, password: string) {
  if (password.length < 8) throw new Error("Choose a password of at least 8 characters");
  const row = await prisma.passwordReset.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) throw new Error("This link is no longer valid");
  await prisma.$transaction([
    prisma.userAccount.update({
      where: { id: row.userId },
      data: { passwordHash: await hashPassword(password), mustChangePassword: false, emailVerified: true },
    }),
    prisma.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.passwordReset.updateMany({
      where: { userId: row.userId, usedAt: null, id: { not: row.id } },
      data: { usedAt: new Date() },
    }),
  ]);
}

export async function sendPasswordReset(email: string) {
  const user = await prisma.userAccount.findUnique({ where: { email } });
  if (!user) return;
  await issuePasswordReset(user);
  await notifyAfterCommit();
}
