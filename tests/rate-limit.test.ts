import { describe, expect, it } from "vitest";
import {
  legalAskRateLimitConfig,
  rateWindowStart
} from "../src/lib/rate-limit/legal-ask";

describe("rateWindowStart", () => {
  it("rounds down to the configured fixed window", () => {
    const now = new Date("2026-10-08T08:07:34.000Z");

    expect(
      rateWindowStart(now, 600).toISOString()
    ).toBe("2026-10-08T08:00:00.000Z");
  });
});

describe("legalAskRateLimitConfig", () => {
  it("uses safe defaults when env values are missing", () => {
    const oldLimit = process.env.LEGAL_ASK_RATE_LIMIT;
    const oldWindow = process.env.LEGAL_ASK_RATE_WINDOW_SECONDS;

    delete process.env.LEGAL_ASK_RATE_LIMIT;
    delete process.env.LEGAL_ASK_RATE_WINDOW_SECONDS;

    expect(legalAskRateLimitConfig()).toEqual({
      limit: 20,
      windowSeconds: 600
    });

    if (oldLimit === undefined) {
      delete process.env.LEGAL_ASK_RATE_LIMIT;
    } else {
      process.env.LEGAL_ASK_RATE_LIMIT = oldLimit;
    }

    if (oldWindow === undefined) {
      delete process.env.LEGAL_ASK_RATE_WINDOW_SECONDS;
    } else {
      process.env.LEGAL_ASK_RATE_WINDOW_SECONDS = oldWindow;
    }
  });
});
