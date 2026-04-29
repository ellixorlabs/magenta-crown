import "server-only";

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const isDev = process.env.NODE_ENV === "development";
  const client = new PrismaClient({
    log: isDev
      ? [{ level: "query", emit: "event" }, "warn", "error"]
      : ["warn", "error"]
  });

  // Dev-only: log duration + trimmed SQL (helps catch slow / N+1 patterns).
  if (isDev) {
    client.$on("query", (e) => {
      const q = e.query.replace(/\s+/g, " ").slice(0, 220);
      console.log(`[prisma] ${e.duration}ms ${q}`);
    });
  }

  return client;
}

/** Single shared client per Node isolate (dev HMR + warm serverless). */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
