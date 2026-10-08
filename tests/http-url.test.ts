import { describe, expect, it } from "vitest";
import { isHttpUrl } from "../src/lib/url/http";

describe("isHttpUrl", () => {
  it("accepts only HTTP and HTTPS absolute URLs", () => {
    expect(isHttpUrl("https://example.com/path")).toBe(true);
    expect(isHttpUrl("http://localhost:3000")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("data:text/html,test")).toBe(false);
    expect(isHttpUrl("ftp://example.com/file")).toBe(false);
    expect(isHttpUrl("/relative")).toBe(false);
  });
});
