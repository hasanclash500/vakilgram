import { describe, expect, it } from "vitest";
import { safeJsonLd } from "../src/lib/seo/safe-json-ld";

describe("safeJsonLd", () => {
  it("escapes characters that can break out of a script tag", () => {
    const serialized = safeJsonLd({
      name: '</script><script>alert("x")</script>',
      ampersand: "A&B"
    });

    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("<script>");
    expect(serialized).toContain("\\u003c/script\\u003e");
    expect(serialized).toContain("A\\u0026B");
  });
});
