import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";
import { cleanupOperationalData } from "@/modules/maintenance/cleanup-service";

const schema = z.object({
  rateLimitRetentionHours: z.number().int().min(1).max(24 * 30).default(48),
  aiUsageRetentionDays: z.number().int().min(1).max(3650).default(90)
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    const input = schema.parse(await request.json());
    const prisma = getPrisma();

    const cleanup = await cleanupOperationalData(
      prisma,
      input
    );

    await writeAudit(prisma, {
      userId: admin.id,
      action: "MAINTENANCE_CLEANUP",
      entityType: "SYSTEM",
      details: {
        ...cleanup,
        rateLimitRetentionHours: input.rateLimitRetentionHours,
        aiUsageRetentionDays: input.aiUsageRetentionDays
      }
    });

    return NextResponse.json({
      ok: true,
      ...cleanup
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
