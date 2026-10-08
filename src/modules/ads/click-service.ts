import type { PrismaClient } from "@/generated/prisma/client";
import { CLICK_DEDUPE_WINDOW_MS } from "./click-dedupe";

export type SponsoredClickStatus =
  | "counted"
  | "duplicate"
  | "not-sponsored";

export interface SponsoredClickResult {
  status: SponsoredClickStatus;
  counted: boolean;
}

export async function recordSponsoredClick(
  prisma: PrismaClient,
  lawyerId: string,
  visitorHash: string,
  now = new Date()
): Promise<SponsoredClickResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT pg_advisory_xact_lock(
        hashtext(${lawyerId} || ':' || ${visitorHash})::bigint
      )
    `;

    const lawyer = await tx.lawyer.findFirst({
      where: {
        id: lawyerId,
        active: true,
        verified: true,
        featured: {
          some: {
            active: true,
            startsAt: { lte: now },
            OR: [
              { endsAt: null },
              { endsAt: { gte: now } }
            ],
            tier: {
              active: true
            }
          }
        }
      },
      select: { id: true }
    });

    if (!lawyer) {
      return {
        status: "not-sponsored",
        counted: false
      };
    }

    const cutoff = new Date(
      now.getTime() - CLICK_DEDUPE_WINDOW_MS
    );

    const duplicate = await tx.adClick.findFirst({
      where: {
        lawyerId,
        visitorHash,
        clickedAt: { gte: cutoff }
      },
      select: { id: true }
    });

    if (duplicate) {
      return {
        status: "duplicate",
        counted: false
      };
    }

    await tx.adClick.create({
      data: {
        lawyerId,
        visitorHash,
        clickedAt: now
      }
    });

    return {
      status: "counted",
      counted: true
    };
  });
}
