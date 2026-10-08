import type { PrismaClient } from "@/generated/prisma/client";
import { featureEnabled } from "@/lib/features";
import { rotateSelection } from "@/modules/ads/rotation";
import type {
  LawyerRecommendation,
  LawyerRecommendationSet
} from "./types";

function toCard(
  lawyer: {
    id: string;
    slug: string;
    fullName: string;
    city: string;
    province: string | null;
    avatarUrl: string | null;
    verified: boolean;
    specialties: Array<{ area: string }>;
    featured: Array<{
      tier: {
        name: string;
        priority: number;
        costPerClick: bigint;
      };
    }>;
    wallet: { balance: bigint } | null;
  },
  sponsored: boolean
): LawyerRecommendation {
  const tier = lawyer.featured
    .map((item) => item.tier)
    .sort((a, b) => b.priority - a.priority)[0];

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
    tierName: sponsored ? tier?.name ?? null : null
  };
}

export async function recommendLawyers(
  prisma: PrismaClient,
  legalArea: string | null,
  city?: string | null,
  now = new Date()
): Promise<LawyerRecommendationSet> {
  const walletEnabled = featureEnabled("WALLET");

  const candidates = await prisma.lawyer.findMany({
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
    take: 40
  });

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

  const featured = eligibleFeatured.sort((a, b) => {
    const aPriority = Math.max(
      ...a.featured.map((item) => item.tier.priority)
    );
    const bPriority = Math.max(
      ...b.featured.map((item) => item.tier.priority)
    );
    return bPriority - aPriority;
  });

  const organic = candidates.filter(
    (lawyer) => !featuredIds.has(lawyer.id)
  );

  const hourlyOffset = Math.floor(
    now.getTime() / (60 * 60 * 1000)
  );

  return {
    featured: rotateSelection(featured, hourlyOffset, 5).map(
      (lawyer) => toCard(lawyer, true)
    ),
    others: rotateSelection(organic, hourlyOffset, 5).map(
      (lawyer) => toCard(lawyer, false)
    )
  };
}
