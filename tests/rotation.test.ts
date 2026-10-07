import { describe, expect, it } from "vitest";
import { rotateSelection } from "../src/modules/ads/rotation";

describe("rotateSelection", () => {
  it("rotates fairly from the requested offset", () => {
    expect(rotateSelection(["a", "b", "c"], 1, 3)).toEqual([
      "b",
      "c",
      "a"
    ]);
  });

  it("never duplicates when limit exceeds available items", () => {
    expect(rotateSelection(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });
});
