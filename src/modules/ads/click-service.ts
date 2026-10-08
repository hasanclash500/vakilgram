import type { PrismaClient } from "@/generated/prisma/client";
import { featureEnabled } from "@/lib/features";
import { CLICK_DEDUPE_WINDOW_MS } from "./click-dedupe";

export type SponsoredClickStatus =
  | "counted"
  | "duplicate"
  | "not-sponsored"
  | "insufficient-funds";

export interface SponsoredClickResult {
  status: SponsoredClickStatus;
  counted: boolean;
  chargedAmount: bigint;
}

export async function recordSponsoredClick(
  prisma: PrismaClient,
  lawyerId: string,
  visitorHash: string,
  now = new Date()
): Promise<SponsoredClickResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<{ locked: number }>>`
      SELECT 1 AS locked
      FROM pg_advisory_xact_lock(
        hashtext(${lawyerId} || ':' || ${visitorHash})::bigint
      )
    `;

    const lawyer = await tx.lawyer.findFirst({
      where: {
        id: lawyerId,
        active: true,
        verified: true
      },
      select: {
        id: true,
        featured: {
          where: {
            active: true,
            startsAt: { lte: now },
            OR: [
              { endsAt: null },
              { endsAt: { gte: now } }
            ],
            tier: { active: true }
          },
          select: {
            tier: {
              select: {
                priority: true,
                costPerClick: true
              }
            }
          }
        }
      }
    });

    if (!lawyer || lawyer.featured.length === 0) {
      return {
        status: "not-sponsored",
        counted: false,
        chargedAmount: 0n
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
      select: {
        id: true,
        chargedAmount: true
      }
    });

    if (duplicate) {
      return {
        status: "duplicate",
        counted: false,
        chargedAmount: duplicate.chargedAmount
      };
    }

    const tier = lawyer.featured
      .map((item) => item.tier)
      .sort((a, b) => b.priority - a.priority)[0];

    const cost = tier?.costPerClick ?? 0n;
    const walletEnabled = featureEnabled("WALLET");

    if (walletEnabled && cost > 0n) {
      await tx.$queryRaw<Array<{ locked: number }>>`
        SELECT 1 AS locked
        FROM pg_advisory_xact_lock(
          hashtext('wallet:' || ${lawyerId})::bigint
        )
      `;

      const wallet = await tx.wallet.findUnique({
        where: { lawyerId }
      });

      if (!wallet || wallet.balance < cost) {
        return {
          status: "insufficient-funds",
          counted: false,
          chargedAmount: 0n
        };
      }

      const click = await tx.adClick.create({
        data: {
          lawyerId,
          visitorHash,
          chargedAmount: cost,
          clickedAt: now
        }
      });

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: wallet.balance - cost
        }
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "AD_CLICK",
          amount: -cost,
          balanceAfter: updatedWallet.balance,
          description: "کسر هزینه کلیک جایگاه ویژه",
          referenceId: click.id,
          idempotencyKey: "ad-click:" + click.id,
          metadata: {
            lawyerId
          }
        }
      });

      await tx.adClick.update({
        where: { id: click.id },
        data: {
          walletTransactionId: transaction.id
        }
      });

      return {
        status: "counted",
        counted: true,
        chargedAmount: cost
      };
    }

    await tx.adClick.create({
      data: {
        lawyerId,
        visitorHash,
        chargedAmount: 0n,
        clickedAt: now
      }
    });

    return {
      status: "counted",
      counted: true,
      chargedAmount: 0n
    };
  });
}
