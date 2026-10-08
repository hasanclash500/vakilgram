import type {
  Prisma,
  PrismaClient,
  WalletTransactionType
} from "@/generated/prisma/client";

export class InsufficientWalletBalanceError extends Error {
  constructor() {
    super("Insufficient wallet balance");
    this.name = "InsufficientWalletBalanceError";
  }
}

export interface WalletAdjustmentInput {
  lawyerId: string;
  amount: bigint;
  type: WalletTransactionType;
  description?: string | null;
  referenceId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export async function adjustWallet(
  prisma: PrismaClient,
  input: WalletAdjustmentInput
) {
  if (input.amount === 0n) {
    throw new Error("Wallet adjustment amount cannot be zero");
  }

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<{ locked: number }>>`
      SELECT 1 AS locked
      FROM pg_advisory_xact_lock(
        hashtext('wallet:' || ${input.lawyerId})::bigint
      )
    `;

    const lawyer = await tx.lawyer.findUnique({
      where: { id: input.lawyerId },
      select: { id: true }
    });

    if (!lawyer) {
      throw new Error("Lawyer not found");
    }

    const wallet = await tx.wallet.upsert({
      where: { lawyerId: input.lawyerId },
      create: {
        lawyerId: input.lawyerId,
        balance: 0n
      },
      update: {}
    });

    if (input.idempotencyKey) {
      const existing = await tx.walletTransaction.findUnique({
        where: { idempotencyKey: input.idempotencyKey }
      });

      if (existing) {
        return {
          walletId: wallet.id,
          balance: existing.balanceAfter ?? wallet.balance,
          transaction: existing,
          duplicate: true
        };
      }
    }

    const nextBalance = wallet.balance + input.amount;

    if (nextBalance < 0n) {
      throw new InsufficientWalletBalanceError();
    }

    const updated = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: nextBalance }
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: input.type,
        amount: input.amount,
        balanceAfter: updated.balance,
        description: input.description ?? null,
        referenceId: input.referenceId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        ...(input.metadata !== undefined
          ? { metadata: input.metadata }
          : {})
      }
    });

    return {
      walletId: wallet.id,
      balance: updated.balance,
      transaction,
      duplicate: false
    };
  });
}
