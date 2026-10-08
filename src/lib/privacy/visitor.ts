import { createHmac, randomUUID } from "node:crypto";

export const VISITOR_COOKIE = "vg_vid";
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function resolveVisitorId(
  existingValue?: string | null
): {
  visitorId: string;
  isNew: boolean;
} {
  const value = existingValue?.trim();

  if (value) {
    return {
      visitorId: value,
      isNew: false
    };
  }

  return {
    visitorId: randomUUID(),
    isNew: true
  };
}

export function hashVisitor(
  visitorId: string,
  secret: string,
  scope = ""
): string {
  const hmac = createHmac("sha256", secret);

  if (scope) {
    hmac.update(scope, "utf8");
    hmac.update("\0", "utf8");
  }

  return hmac.update(visitorId, "utf8").digest("hex");
}
