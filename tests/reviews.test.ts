import { describe, expect, it } from "vitest";
import { bayesianRating } from "../src/modules/reviews/service";

describe("bayesianRating", () => {
  it("shrinks a single perfect review toward the prior", () => {
    expect(bayesianRating(5, 1, 3, 5)).toBeCloseTo(
      3.333333,
      5
    );
  });

  it("lets a well-established rating dominate the prior", () => {
    expect(bayesianRating(4.5, 100, 3, 5)).toBeGreaterThan(4.4);
  });

  it("returns the prior when there are no reviews", () => {
    expect(bayesianRating(0, 0, 3.2, 5)).toBe(3.2);
  });
});
