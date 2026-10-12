import { prisma } from "./db";

/** Simple DB-backed rate limit for public verify endpoints */
export async function checkRateLimit(key: string, limit = 60, windowMs = 60_000) {
  const now = new Date();
  const bucket = await prisma.rateLimitBucket.findUnique({ where: { id: key } });
  if (!bucket || now.getTime() - bucket.windowStart.getTime() > windowMs) {
    await prisma.rateLimitBucket.upsert({
      where: { id: key },
      create: { id: key, count: 1, windowStart: now },
      update: { count: 1, windowStart: now },
    });
    return { allowed: true, remaining: limit - 1 };
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  await prisma.rateLimitBucket.update({
    where: { id: key },
    data: { count: bucket.count + 1 },
  });
  return { allowed: true, remaining: limit - bucket.count - 1 };
}
