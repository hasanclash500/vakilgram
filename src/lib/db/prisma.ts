import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

declare global {
  var __vakilgramPrisma: PrismaClient | undefined;
}

export function getPrisma(): PrismaClient {
  if (globalThis.__vakilgramPrisma) {
    return globalThis.__vakilgramPrisma;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString })
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__vakilgramPrisma = client;
  }

  return client;
}
