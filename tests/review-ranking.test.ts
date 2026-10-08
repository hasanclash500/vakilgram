import { describe, expect, it } from "vitest";
import {
  rankByBayesian,
  ratingStats
} from "../src/modules/reviews/ranking";

describe("ratingStats", () => {
  it("shrinks small samples toward the prior", () => {
    const oneFive = ratingStats([5], 3, 5);
    const manyFives = ratingStats([5, 5, 5, 5, 5, 5, 5, 5], 3, 5);

    expect(oneFive.bayesian).toBeLessThan(manyFives.bayesian!);
    expect(oneFive.bayesian).toBeGreaterThan(3);
  });
});

describe("rankByBayesian", () => {
  it("ranks stronger Bayesian evidence ahead of weaker ratings", () => {
    const ranked = rankByBayesian(
      [
        { id: "weak", reviews: [{ rating: 5 }] },
        {
          id: "strong",
          reviews: Array.from({ length: 10 }, () => ({ rating: 5 }))
        },
        {
          id: "poor",
          reviews: Array.from({ length: 10 }, () => ({ rating: 2 }))
        }
      ],
      3,
      0,
      3
    );

    expect(ranked.map((item) => item.id)).toEqual([
      "strong",
      "weak",
      "poor"
    ]);
  });

  it("rotates items only inside equal-score groups", () => {
    const ranked = rankByBayesian(
      [
        { id: "a", reviews: [{ rating: 4 }] },
        { id: "b", reviews: [{ rating: 4 }] },
        { id: "c", reviews: [{ rating: 2 }] }
      ],
      3,
      1,
      3
    );

    expect(ranked.slice(0, 2).map((item) => item.id)).toEqual([
      "b",
      "a"
    ]);
    expect(ranked[2]?.id).toBe("c");
  });
});
