import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";

const schema = z.object({
  rateLimitRetentionHours: z.number().int().min(1).max(24 * 30).default(48),
  aiUsageRetentionDays: z.number().int().min(1).max(3650).default(90)
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    const input = schema.parse(await request.json());
    const prisma = getPrisma();
    const now = Date.now();

    const rateLimitCutoff = new Date(
      now - input.rateLimitRetentionHours * 60 * 60 * 1000
    );
    const aiUsageCutoff = new Date(
      now - input.aiUsageRetentionDays * 24 * 60 * 60 * 1000
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

    await writeAudit(prisma, {
      userId: admin.id,
      action: "MAINTENANCE_CLEANUP",
      entityType: "SYSTEM",
      details: {
        deletedRateLimitRows: rateLimits.count,
        deletedAiUsageRows: aiUsage.count,
        rateLimitRetentionHours: input.rateLimitRetentionHours,
        aiUsageRetentionDays: input.aiUsageRetentionDays
      }
    });

    return NextResponse.json({
      ok: true,
      deletedRateLimitRows: rateLimits.count,
      deletedAiUsageRows: aiUsage.count
    });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "تنظیمات پاکسازی نامعتبر است." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "پاکسازی انجام نشد." },
      { status: 503 }
    );
  }
}
