import type { Prisma, PrismaClient } from "@/generated/prisma/client";

export async function writeAudit(
  prisma: PrismaClient,
  input: {
    userId: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      details: input.details
        ? (JSON.parse(JSON.stringify(input.details)) as Prisma.InputJsonValue)
        : undefined
    }
  });
}
