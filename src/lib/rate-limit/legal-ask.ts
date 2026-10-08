import type { PrismaClient } from "@/generated/prisma/client";

export const DEFAULT_LEGAL_ASK_LIMIT = 20;
export const DEFAULT_LEGAL_ASK_WINDOW_SECONDS = 10 * 60;

function positiveInteger(
  value: string | undefined,
  fallback: number,
  maximum: number
): number {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, maximum);
}

export function legalAskRateLimitConfig() {
  return {
    limit: positiveInteger(
      process.env.LEGAL_ASK_RATE_LIMIT,
      DEFAULT_LEGAL_ASK_LIMIT,
      1000
    ),
    windowSeconds: positiveInteger(
      process.env.LEGAL_ASK_RATE_WINDOW_SECONDS,
      DEFAULT_LEGAL_ASK_WINDOW_SECONDS,
      24 * 60 * 60
    )
  };
}

export function rateWindowStart(
  now: Date,
  windowSeconds: number
): Date {
  const windowMs = windowSeconds * 1000;
  const timestamp =
    Math.floor(now.getTime() / windowMs) * windowMs;

  return new Date(timestamp);
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

export async function consumeLegalAskRateLimit(
  prisma: PrismaClient,
  visitorHash: string,
  now = new Date()
): Promise<RateLimitResult> {
  const config = legalAskRateLimitConfig();
  const windowStart = rateWindowStart(now, config.windowSeconds);

  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "api_rate_limits"
      ("scope", "visitor_hash", "window_start", "count", "updated_at")
    VALUES
      ('legal-ask', ${visitorHash}, ${windowStart}, 1, CURRENT_TIMESTAMP)
    ON CONFLICT ("scope", "visitor_hash", "window_start")
    DO UPDATE SET
      "count" = "api_rate_limits"."count" + 1,
      "updated_at" = CURRENT_TIMESTAMP
    RETURNING "count"
  `;

  const count = rows[0]?.count ?? 1;
  const windowEnd =
    windowStart.getTime() + config.windowSeconds * 1000;

  return {
    allowed: count <= config.limit,
    limit: config.limit,
    remaining: Math.max(0, config.limit - count),
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((windowEnd - now.getTime()) / 1000)
    )
  };
}
