import { describe, expect, it } from "vitest";
import { shouldCountClick } from "../src/modules/ads/click-dedupe";

describe("shouldCountClick", () => {
  const now = new Date("2026-10-07T12:00:00Z");

  it("counts a first click", () => {
    expect(shouldCountClick(null, now)).toBe(true);
  });

  it("rejects a repeat click inside one hour", () => {
    const last = new Date("2026-10-07T11:30:01Z");
    expect(shouldCountClick(last, now)).toBe(false);
  });

  it("counts again after one hour", () => {
    const last = new Date("2026-10-07T11:00:00Z");
    expect(shouldCountClick(last, now)).toBe(true);
  });
});
