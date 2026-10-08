import type { PrismaClient } from "@/generated/prisma/client";

export class LawyerOwnershipError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "LawyerOwnershipError";
  }
}

export async function setLawyerOwner(
  prisma: PrismaClient,
  lawyerId: string,
  email: string | null
) {
  const normalizedEmail = email?.trim().toLowerCase() || null;

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<{ locked: number }>>`
      SELECT 1 AS locked
      FROM pg_advisory_xact_lock(
        hashtext('lawyer-owner:' || ${lawyerId})::bigint
      )
    `;

    const lawyer = await tx.lawyer.findUnique({
      where: { id: lawyerId },
      select: {
        id: true,
        userId: true
      }
    });

    if (!lawyer) {
      throw new LawyerOwnershipError("LAWYER_NOT_FOUND");
    }

    if (!normalizedEmail) {
      const updated = await tx.lawyer.update({
        where: { id: lawyerId },
        data: { userId: null },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          }
        }
      });

      return {
        lawyer: updated,
        ownerEmail: null
      };
    }

    const user = await tx.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        role: true,
        lawyer: {
          select: { id: true }
        }
      }
    });

    if (!user) {
      throw new LawyerOwnershipError("USER_NOT_FOUND");
    }

    if (user.lawyer && user.lawyer.id !== lawyerId) {
      throw new LawyerOwnershipError("USER_ALREADY_HAS_LAWYER");
    }

    if (lawyer.userId && lawyer.userId !== user.id) {
      throw new LawyerOwnershipError("LAWYER_ALREADY_HAS_OWNER");
    }

    await tx.lawyer.update({
      where: { id: lawyerId },
      data: { userId: user.id }
    });

    await tx.wallet.upsert({
      where: { lawyerId },
      create: {
        lawyerId,
        balance: 0n
      },
      update: {}
    });

    if (user.role === "USER") {
      await tx.user.update({
        where: { id: user.id },
        data: { role: "LAWYER" }
      });
    }

    const updated = await tx.lawyer.findUniqueOrThrow({
      where: { id: lawyerId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    return {
      lawyer: updated,
      ownerEmail: updated.user?.email ?? null
    };
  });
}
