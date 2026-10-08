import { describe, expect, it } from "vitest";
import { voiceRecognitionErrorMessage } from "../src/modules/voice/errors";

describe("voiceRecognitionErrorMessage", () => {
  it("returns a clear Persian permission message", () => {
    expect(voiceRecognitionErrorMessage("not-allowed")).toContain(
      "مجوز میکروفون"
    );
  });

  it("returns a useful no-speech message", () => {
    expect(voiceRecognitionErrorMessage("no-speech")).toContain(
      "صدایی تشخیص داده نشد"
    );
  });

  it("uses a safe generic message for unknown browser errors", () => {
    expect(voiceRecognitionErrorMessage("unknown-provider-text")).toBe(
      "تشخیص صوت در این مرورگر با خطا روبه‌رو شد."
    );
  });
});
