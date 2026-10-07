import { describe, expect, it } from "vitest";
import { validateCitationIds } from "../src/modules/legal-qa/citation-validator";

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
