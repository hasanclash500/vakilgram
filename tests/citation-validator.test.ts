import { describe, expect, it } from "vitest";
import {
  collectGroundedCitationIds,
  groundCitedTexts,
  validateCitationIds
} from "../src/modules/legal-qa/citation-validator";

describe("validateCitationIds", () => {
  it("removes hallucinated and duplicate ids", () => {
    expect(
      validateCitationIds(["a", "x", "a", "b"], ["a", "b", "c"])
    ).toEqual(["a", "b"]);
  });

  it("returns empty when nothing is grounded", () => {
    expect(validateCitationIds(["x"], ["a"])).toEqual([]);
  });
});

describe("groundCitedTexts", () => {
  it("drops a paragraph that has no valid citation", () => {
    expect(
      groundCitedTexts(
        [
          { text: "بند نامعتبر", articleIds: ["fake"] },
          { text: "بند معتبر", articleIds: ["a", "fake"] }
        ],
        ["a"]
      )
    ).toEqual([
      { text: "بند معتبر", articleIds: ["a"] }
    ]);
  });

  it("collects unique citations in stable order", () => {
    expect(
      collectGroundedCitationIds([
        { text: "یک", articleIds: ["a", "b"] },
        { text: "دو", articleIds: ["b", "c"] }
      ])
    ).toEqual(["a", "b", "c"]);
  });
});
