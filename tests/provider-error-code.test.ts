import { describe, expect, it } from "vitest";
import { providerErrorCode } from "../src/providers/telemetry/error-code";

describe("providerErrorCode", () => {
  it("extracts HTTP status without retaining provider body text", () => {
    expect(
      providerErrorCode(new Error("Provider X: HTTP 429 secret-output"))
    ).toBe("HTTP_429");
  });

  it("classifies parser and schema errors without storing messages", () => {
    expect(providerErrorCode(new SyntaxError("raw model text"))).toBe(
      "INVALID_JSON"
    );

    const schemaError = new Error("sensitive invalid value");
    schemaError.name = "ZodError";

    expect(providerErrorCode(schemaError)).toBe("INVALID_SCHEMA");
  });

  it("uses a generic code for unknown errors", () => {
    expect(providerErrorCode(new Error("arbitrary upstream text"))).toBe(
      "PROVIDER_ERROR"
    );
  });
});
