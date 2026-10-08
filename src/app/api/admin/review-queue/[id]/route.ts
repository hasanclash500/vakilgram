import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";
import {
  LawReviewError,
  reviewStagedLawChange
} from "@/modules/laws/review-service";

const schema = z.object({
  decision: z.enum(["approve", "reject"])
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const prisma = getPrisma();

    const result = await reviewStagedLawChange(
      prisma,
      id,
      admin.id,
      input.decision
    );

    await writeAudit(prisma, {
      userId: admin.id,
      action:
        input.decision === "approve"
          ? "LAW_REVIEW_APPROVE"
          : "LAW_REVIEW_REJECT",
      entityType: "REVIEW_QUEUE",
      entityId: id,
      details: {
        indexedArticles: result.indexedArticles
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "تصمیم بازبینی نامعتبر است." },
        { status: 400 }
      );
    }

    if (error instanceof LawReviewError) {
      const status =
        error.code === "REVIEW_NOT_FOUND"
          ? 404
          : error.code === "STALE_REVIEW" ||
              error.code === "REVIEW_ALREADY_RESOLVED"
            ? 409
            : 400;

      return NextResponse.json(
        {
          error:
            error.code === "STALE_REVIEW"
              ? "این تغییر نسبت به نسخه فعلی قدیمی شده است؛ ابتدا دوباره منبع را بررسی کنید."
              : "اعمال تصمیم بازبینی انجام نشد.",
          code: error.code
        },
        { status }
      );
    }

    return NextResponse.json(
      { error: "اعمال تصمیم بازبینی انجام نشد." },
      { status: 503 }
    );
  }
}
