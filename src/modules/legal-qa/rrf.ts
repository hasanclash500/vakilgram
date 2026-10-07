export interface RankedItem {
  id: string;
  rank: number;
}

export function reciprocalRankFusion(
  rankings: RankedItem[][],
  k = 60
): Map<string, number> {
  const scores = new Map<string, number>();

  for (const ranking of rankings) {
    for (const item of ranking) {
      scores.set(
        item.id,
        (scores.get(item.id) ?? 0) + 1 / (k + item.rank)
      );
    }
  }

  return scores;
}
