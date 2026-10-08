import type { PrismaClient } from "@/generated/prisma/client";
import { featureEnabled } from "@/lib/features";

export class ReviewError extends Error {
  constructor(
    public readonly status: 400 | 403 | 404 | 409,
    message: string
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

export function bayesianRating(
  average: number,
  count: number,
  priorAverage: number,
  priorWeight = 5
): number {
  if (count <= 0) return priorAverage;

  return (
    (count * average + priorWeight * priorAverage) /
    (count + priorWeight)
  );
}

export async function reviewEligibility(
  prisma: PrismaClient,
  userId: string,
  lawyerId: string,
  conversationId: string
) {
  if (!featureEnabled("REVIEWS")) {
    return {
      eligible: false,
      reason: "disabled" as const
    };
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
      lawyerId,
      status: "CLOSED",
      consentToStore: true
    },
    select: { id: true }
  });

  if (!conversation) {
    return {
      eligible: false,
      reason: "conversation" as const
    };
  }

  const [userMessages, lawyerMessages, existing] =
    await Promise.all([
      prisma.message.count({
        where: {
          conversationId,
          role: "USER"
        }
      }),
      prisma.message.count({
        where: {
          conversationId,
          role: "LAWYER"
        }
      }),
      prisma.review.findUnique({
        where: { interactionRef: conversationId },
        select: { id: true }
      })
    ]);

  if (existing) {
    return {
      eligible: false,
      reason: "already-reviewed" as const
    };
  }

  if (userMessages < 1 || lawyerMessages < 1) {
    return {
      eligible: false,
      reason: "no-two-way-interaction" as const
    };
  }

  return {
    eligible: true,
    reason: null
  } as const;
}

export async function createVerifiedReview(
  prisma: PrismaClient,
  input: {
    userId: string;
    lawyerId: string;
    conversationId: string;
    rating: number;
    comment?: string | null;
  }
) {
  if (!featureEnabled("REVIEWS")) {
    throw new ReviewError(404, "Reviews are disabled");
  }

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new ReviewError(400, "Rating is invalid");
  }

  const comment = input.comment?.trim() || null;

  if (comment && comment.length > 2000) {
    throw new ReviewError(400, "Comment is too long");
  }

  const eligibility = await reviewEligibility(
    prisma,
    input.userId,
    input.lawyerId,
    input.conversationId
  );

  if (!eligibility.eligible) {
    if (eligibility.reason === "already-reviewed") {
      throw new ReviewError(
        409,
        "This interaction already has a review"
      );
    }

    throw new ReviewError(
      403,
      "A completed two-way interaction is required"
    );
  }

  return prisma.review.create({
    data: {
      lawyerId: input.lawyerId,
      userId: input.userId,
      rating: input.rating,
      comment,
      interactionRef: input.conversationId
    }
  });
}

export async function getLawyerReviewSummary(
  prisma: PrismaClient,
  lawyerId: string,
  priorWeight = 5
) {
  const [lawyerAggregate, globalAggregate] = await Promise.all([
    prisma.review.aggregate({
      where: {
        lawyerId,
        hiddenAt: null
      },
      _avg: { rating: true },
      _count: { rating: true }
    }),
    prisma.review.aggregate({
      where: { hiddenAt: null },
      _avg: { rating: true }
    })
  ]);

  const count = lawyerAggregate._count.rating;
  const average = lawyerAggregate._avg.rating ?? 0;
  const priorAverage = globalAggregate._avg.rating ?? 3;

  return {
    count,
    average:
      count > 0
        ? Math.round(average * 100) / 100
        : null,
    bayesian:
      count > 0
        ? Math.round(
            bayesianRating(
              average,
              count,
              priorAverage,
              priorWeight
            ) * 100
          ) / 100
        : null,
    priorAverage:
      Math.round(priorAverage * 100) / 100
  };
}
