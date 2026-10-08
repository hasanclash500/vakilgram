import { createHmac } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { rateWindowStart } from "@/lib/rate-limit/legal-ask";

const LIMIT = 5;
const WINDOW_SECONDS = 10 * 60;

function rateLimitSecret(): string {
  const value =
    process.env.ADMIN_2FA_COOKIE_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim();

  if (!value || value.length < 24) {
    throw new Error("Admin 2FA rate-limit secret is not configured");
  }

  return value;
}

function subjectHash(userId: string): string {
  return createHmac("sha256", rateLimitSecret())
    .update("vakilgram-admin-2fa\0" + userId)
    .digest("hex");
}

export async function consumeAdminTwoFactorRateLimit(
  prisma: PrismaClient,
  userId: string,
  now = new Date()
) {
  const windowStart = rateWindowStart(now, WINDOW_SECONDS);
  const visitorHash = subjectHash(userId);

  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "api_rate_limits"
      ("scope", "visitor_hash", "window_start", "count", "updated_at")
    VALUES
      ('admin-2fa', ${visitorHash}, ${windowStart}, 1, CURRENT_TIMESTAMP)
    ON CONFLICT ("scope", "visitor_hash", "window_start")
    DO UPDATE SET
      "count" = "api_rate_limits"."count" + 1,
      "updated_at" = CURRENT_TIMESTAMP
    RETURNING "count"
  `;

  const count = rows[0]?.count ?? 1;
  const windowEnd =
    windowStart.getTime() + WINDOW_SECONDS * 1000;

  return {
    allowed: count <= LIMIT,
    limit: LIMIT,
    remaining: Math.max(0, LIMIT - count),
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((windowEnd - now.getTime()) / 1000)
    )
  };
}
