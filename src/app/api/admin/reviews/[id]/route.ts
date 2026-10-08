import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";

const schema = z.discriminatedUnion("hidden", [
  z.object({
    hidden: z.literal(true),
    reason: z.string().trim().min(5).max(500)
  }),
  z.object({
    hidden: z.literal(false),
    reason: z.string().trim().max(500).optional()
  })
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const prisma = getPrisma();

    const review = await prisma.review.update({
      where: { id },
      data: input.hidden
        ? {
            hiddenAt: new Date(),
            hiddenReason: input.reason
          }
        : {
            hiddenAt: null,
            hiddenReason: null
          },
      select: {
        id: true,
        lawyerId: true,
        hiddenAt: true
      }
    });

    await writeAudit(prisma, {
      userId: admin.id,
      action: input.hidden
        ? "REVIEW_HIDE"
        : "REVIEW_UNHIDE",
      entityType: "REVIEW",
      entityId: review.id,
      details: {
        lawyerId: review.lawyerId,
        ...(input.hidden ? { reason: input.reason } : {})
      }
    });

    return NextResponse.json({
      ok: true,
      hidden: Boolean(review.hiddenAt)
    });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error:
            "برای پنهان‌کردن نظر، دلیل حداقل ۵ کاراکتری لازم است."
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "تغییر وضعیت نظر انجام نشد." },
      { status: 400 }
    );
  }
}
