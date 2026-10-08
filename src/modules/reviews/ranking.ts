import { rotateSelection } from "@/modules/ads/rotation";
import { bayesianRating } from "./service";

export interface RatingStats {
  count: number;
  average: number | null;
  bayesian: number | null;
}

export function ratingStats(
  ratings: readonly number[],
  priorAverage: number,
  priorWeight = 5
): RatingStats {
  if (ratings.length === 0) {
    return {
      count: 0,
      average: null,
      bayesian: priorAverage
    };
  }

  const average =
    ratings.reduce((sum, rating) => sum + rating, 0) /
    ratings.length;

  return {
    count: ratings.length,
    average,
    bayesian: bayesianRating(
      average,
      ratings.length,
      priorAverage,
      priorWeight
    )
  };
}

export function rankByBayesian<
  T extends {
    id: string;
    reviews: readonly { rating: number }[];
  }
>(
  items: readonly T[],
  priorAverage: number,
  rotationOffset: number,
  limit: number
): T[] {
  const enriched = items
    .map((item) => ({
      item,
      stats: ratingStats(
        item.reviews.map((review) => review.rating),
        priorAverage
      )
    }))
    .sort((a, b) => {
      const scoreDiff =
        (b.stats.bayesian ?? priorAverage) -
        (a.stats.bayesian ?? priorAverage);

      if (Math.abs(scoreDiff) > 0.005) return scoreDiff;

      const countDiff = b.stats.count - a.stats.count;
      if (countDiff !== 0) return countDiff;

      return a.item.id.localeCompare(b.item.id);
    });

  const groups = new Map<string, T[]>();

  for (const entry of enriched) {
    const key = (entry.stats.bayesian ?? priorAverage).toFixed(2);
    const group = groups.get(key) ?? [];
    group.push(entry.item);
    groups.set(key, group);
  }

  const result: T[] = [];

  for (const group of groups.values()) {
    result.push(
      ...rotateSelection(
        group,
        rotationOffset,
        group.length
      )
    );
  }

  return result.slice(0, limit);
}
