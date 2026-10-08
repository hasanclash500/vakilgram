import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";
import { featureEnabled } from "@/lib/features";
import {
  adjustWallet,
  InsufficientWalletBalanceError
} from "@/modules/ads/wallet-service";

const schema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^-?[1-9]\d*$/, "amount must be a non-zero integer"),
  description: z.string().trim().min(3).max(300)
});

export async function POST(
  request: Request,
  context: { params: Promise<{ lawyerId: string }> }
) {
  try {
    if (!featureEnabled("WALLET")) {
      return NextResponse.json(
        { error: "قابلیت کیف پول غیرفعال است." },
        { status: 404 }
      );
    }

    const admin = await requireAdminUser();
    const { lawyerId } = await context.params;
    const input = schema.parse(await request.json());
    const amount = BigInt(input.amount);
    const prisma = getPrisma();

    const result = await adjustWallet(prisma, {
      lawyerId,
      amount,
      type: amount > 0n ? "CREDIT" : "DEBIT",
      description: input.description,
      metadata: {
        source: "admin-manual-adjustment",
        adminUserId: admin.id
      }
    });

    await writeAudit(prisma, {
      userId: admin.id,
      action: "WALLET_ADJUSTMENT",
      entityType: "LAWYER",
      entityId: lawyerId,
      details: {
        amount: amount.toString(),
        balanceAfter: result.balance.toString(),
        transactionId: result.transaction.id
      }
    });

    return NextResponse.json({
      ok: true,
      balance: result.balance.toString(),
      transactionId: result.transaction.id
    });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "مبلغ یا توضیح نامعتبر است." },
        { status: 400 }
      );
    }

    if (error instanceof InsufficientWalletBalanceError) {
      return NextResponse.json(
        { error: "موجودی کیف پول برای این برداشت کافی نیست." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "تغییر موجودی انجام نشد." },
      { status: 400 }
    );
  }
}
