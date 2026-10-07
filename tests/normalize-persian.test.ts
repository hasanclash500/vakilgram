import { describe, expect, it } from "vitest";
import { normalizePersian } from "../src/lib/text/normalize-persian";

describe("normalizePersian", () => {
  it("normalizes Arabic variants and digits", () => {
    expect(normalizePersian("كي ۱۲٣")).toBe("کی 123");
  });

  it("removes diacritics and tatweel", () => {
    expect(normalizePersian("قَــانون")).toBe("قانون");
  });
});
