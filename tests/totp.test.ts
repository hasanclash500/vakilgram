import { describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  generateRecoveryCodes,
  totpCode,
  verifyTotp
} from "../src/modules/auth/totp";

describe("TOTP", () => {
  it("round-trips Base32 secrets", () => {
    const input = Buffer.from("vakilgram-phase-two");
    expect(base32Decode(base32Encode(input))).toEqual(input);
  });

  it("verifies the generated code in the same time window", () => {
    const secret = base32Encode(
      Buffer.from("12345678901234567890")
    );
    const now = Date.UTC(2026, 9, 8, 8, 0, 0);
    const code = totpCode(secret, now);

    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotp(secret, code, now)).toBe(true);
    expect(verifyTotp(secret, "000000", now)).toBe(
      code === "000000"
    );
  });

  it("generates unique human-readable recovery codes", () => {
    const codes = generateRecoveryCodes(8);
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    expect(codes.every((code) => /^[A-F0-9]{4}(-[A-F0-9]{4}){3}$/.test(code))).toBe(true);
  });
});
