import { NextResponse } from "next/server";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";
import {
  refreshLawSource,
  SourceUpdateError
} from "@/modules/laws/source-update-service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await context.params;
    const prisma = getPrisma();

    const result = await refreshLawSource(prisma, id);

    await writeAudit(prisma, {
      userId: admin.id,
      action: "LAW_SOURCE_REFRESH",
      entityType: "SOURCE",
      entityId: id,
      details: {
        runId: result.runId,
        documents: result.documents,
        queued: result.queued,
        unchanged: result.unchanged,
        existingPending: result.existingPending,
        status: result.status
      }
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof SourceUpdateError) {
      return NextResponse.json(
        {
          error:
            "به‌روزرسانی منبع انجام نشد. تنظیم adapter یا دسترسی منبع را بررسی کنید.",
          code: error.code
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "به‌روزرسانی منبع انجام نشد." },
      { status: 503 }
    );
  }
}
