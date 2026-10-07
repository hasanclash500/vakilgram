import { describe, expect, it } from "vitest";
import { reciprocalRankFusion } from "../src/modules/legal-qa/rrf";

describe("reciprocalRankFusion", () => {
  it("rewards documents present in multiple rankings", () => {
    const scores = reciprocalRankFusion([
      [{ id: "a", rank: 1 }, { id: "b", rank: 2 }],
      [{ id: "b", rank: 1 }, { id: "c", rank: 2 }]
    ]);

    expect(scores.get("b")!).toBeGreaterThan(scores.get("a")!);
    expect(scores.get("b")!).toBeGreaterThan(scores.get("c")!);
  });
});
