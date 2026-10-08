import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/user";
import { reviewErrorResponse } from "@/modules/reviews/http";
import { createVerifiedReview } from "@/modules/reviews/service";

const schema = z.object({
  lawyerId: z.string().min(1),
  conversationId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional()
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await request.json());

    const review = await createVerifiedReview(
      getPrisma(),
      {
        userId: user.id,
        lawyerId: input.lawyerId,
        conversationId: input.conversationId,
        rating: input.rating,
        comment: input.comment
      }
    );

    return NextResponse.json({
      ok: true,
      reviewId: review.id
    });
  } catch (error) {
    const mapped = reviewErrorResponse(error);
    if (mapped) return mapped;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "اطلاعات نظر نامعتبر است." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "ثبت نظر انجام نشد." },
      { status: 503 }
    );
  }
}
