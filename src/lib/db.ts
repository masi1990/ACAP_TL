import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** P1001 never reached Postgres. P1017 means the socket was already closed. */
const RETRYABLE = new Set(["P1001", "P1017"]);

function createPrisma() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  client.$use(async (params, next) => {
    try {
      return await next(params);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && RETRYABLE.has(error.code)) {
        return next(params);
      }
      throw error;
    }
  });
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
