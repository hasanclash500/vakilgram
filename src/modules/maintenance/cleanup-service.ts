import type { PrismaClient } from "@/generated/prisma/client";

export interface OperationalCleanupInput {
  rateLimitRetentionHours: number;
  aiUsageRetentionDays: number;
}

export interface OperationalCleanupResult {
  deletedRateLimitRows: number;
  deletedAiUsageRows: number;
}

export async function cleanupOperationalData(
  prisma: PrismaClient,
  input: OperationalCleanupInput,
  now = new Date()
): Promise<OperationalCleanupResult> {
  const rateLimitCutoff = new Date(
    now.getTime() -
      input.rateLimitRetentionHours * 60 * 60 * 1000
  );

  const aiUsageCutoff = new Date(
    now.getTime() -
      input.aiUsageRetentionDays * 24 * 60 * 60 * 1000
  );

  const [rateLimits, aiUsage] = await prisma.$transaction([
    prisma.apiRateLimit.deleteMany({
      where: {
        windowStart: { lt: rateLimitCutoff }
      }
    }),
    prisma.aiUsageLog.deleteMany({
      where: {
        createdAt: { lt: aiUsageCutoff }
      }
    })
  ]);

  return {
    deletedRateLimitRows: rateLimits.count,
    deletedAiUsageRows: aiUsage.count
  };
}
