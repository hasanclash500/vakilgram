import type { PrismaClient } from "@/generated/prisma/client";
import { featureEnabled } from "@/lib/features";
import { rotateSelection } from "@/modules/ads/rotation";
import {
  rankByBayesian,
  ratingStats
} from "@/modules/reviews/ranking";
import type {
  LawyerRecommendation,
  LawyerRecommendationSet
} from "./types";

type Candidate = {
  id: string;
  slug: string;
  fullName: string;
  city: string;
  province: string | null;
  avatarUrl: string | null;
  verified: boolean;
  specialties: Array<{ area: string }>;
  reviews: Array<{ rating: number }>;
  featured: Array<{
    tier: {
      name: string;
      priority: number;
      costPerClick: bigint;
    };
  }>;
  wallet: { balance: bigint } | null;
};

function toCard(
  lawyer: Candidate,
  sponsored: boolean,
  priorAverage: number,
  reviewsEnabled: boolean
): LawyerRecommendation {
  const tier = lawyer.featured
    .map((item) => item.tier)
    .sort((a, b) => b.priority - a.priority)[0];

  const stats = reviewsEnabled
    ? ratingStats(
        lawyer.reviews.map((review) => review.rating),
        priorAverage
      )
    : {
        count: 0,
        average: null,
        bayesian: null
      };

  return {
    id: lawyer.id,
    slug: lawyer.slug,
    fullName: lawyer.fullName,
    city: lawyer.city,
    province: lawyer.province,
    avatarUrl: lawyer.avatarUrl,
    verified: lawyer.verified,
    specialties: lawyer.specialties.map((item) => item.area),
    sponsored,
    tierName: sponsored ? tier?.name ?? null : null,
    rating:
      stats.count > 0 && stats.bayesian !== null
        ? Math.round(stats.bayesian * 100) / 100
        : null,
    reviewCount: stats.count
  };
}

function rotateFeaturedByPriority(
  lawyers: Candidate[],
  offset: number,
  limit: number
): Candidate[] {
  const groups = new Map<number, Candidate[]>();

  for (const lawyer of lawyers) {
    const priority = Math.max(
      ...lawyer.featured.map((item) => item.tier.priority)
    );
    const group = groups.get(priority) ?? [];
    group.push(lawyer);
    groups.set(priority, group);
  }

  const priorities = [...groups.keys()].sort((a, b) => b - a);
  const result: Candidate[] = [];

  for (const priority of priorities) {
    const group = groups.get(priority) ?? [];
    result.push(...rotateSelection(group, offset, group.length));

    if (result.length >= limit) break;
  }

  return result.slice(0, limit);
}

export async function recommendLawyers(
  prisma: PrismaClient,
  legalArea: string | null,
  city?: string | null,
  now = new Date()
): Promise<LawyerRecommendationSet> {
  const walletEnabled = featureEnabled("WALLET");
  const reviewsEnabled = featureEnabled("REVIEWS");

  const [candidates, globalReviewAggregate] = await Promise.all([
    prisma.lawyer.findMany({
      where: {
        active: true,
        verified: true,
        ...(city?.trim() ? { city: city.trim() } : {}),
        ...(legalArea?.trim()
          ? {
              specialties: {
                some: {
                  area: {
                    contains: legalArea.trim()
                  }
                }
              }
            }
          : {})
      },
      include: {
        specialties: {
          select: { area: true }
        },
        reviews: {
          where: { hiddenAt: null },
          select: { rating: true }
        },
        wallet: {
          select: { balance: true }
        },
        featured: {
          where: {
            active: true,
            startsAt: { lte: now },
            OR: [
              { endsAt: null },
              { endsAt: { gte: now } }
            ],
            tier: { active: true }
          },
          include: {
            tier: {
              select: {
                name: true,
                priority: true,
                costPerClick: true
              }
            }
          }
        }
      },
      take: 100
    }),
    reviewsEnabled
      ? prisma.review.aggregate({
          where: { hiddenAt: null },
          _avg: { rating: true }
        })
      : Promise.resolve({ _avg: { rating: null } })
  ]);

  const priorAverage = globalReviewAggregate._avg.rating ?? 3;

  const eligibleFeatured = candidates.filter((lawyer) => {
    if (lawyer.featured.length === 0) return false;
    if (!walletEnabled) return true;

    const tier = lawyer.featured
      .map((item) => item.tier)
      .sort((a, b) => b.priority - a.priority)[0];

    const cost = tier?.costPerClick ?? 0n;
    return cost === 0n || (lawyer.wallet?.balance ?? 0n) >= cost;
  });

  const featuredIds = new Set(
    eligibleFeatured.map((lawyer) => lawyer.id)
  );

  const organic = candidates.filter(
    (lawyer) => !featuredIds.has(lawyer.id)
  );

  const hourlyOffset = Math.floor(
    now.getTime() / (60 * 60 * 1000)
  );

  const featured = rotateFeaturedByPriority(
    eligibleFeatured,
    hourlyOffset,
    5
  );

  const others = reviewsEnabled
    ? rankByBayesian(
        organic,
        priorAverage,
        hourlyOffset,
        5
      )
    : rotateSelection(organic, hourlyOffset, 5);

  return {
    featured: featured.map((lawyer) =>
      toCard(lawyer, true, priorAverage, reviewsEnabled)
    ),
    others: others.map((lawyer) =>
      toCard(lawyer, false, priorAverage, reviewsEnabled)
    )
  };
}
