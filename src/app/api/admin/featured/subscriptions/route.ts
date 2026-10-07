import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";

const schema = z.object({
  id: z.string().optional(),
  lawyerId: z.string().min(1).optional(),
  tierId: z.string().min(1).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  active: z.boolean().optional()
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    const input = schema.parse(await request.json());
    const prisma = getPrisma();

    const subscription = input.id
      ? await prisma.lawyerFeaturedSubscription.update({
          where: { id: input.id },
          data: {
            ...(input.tierId ? { tierId: input.tierId } : {}),
            ...(input.startsAt ? { startsAt: new Date(input.startsAt) } : {}),
            ...(input.endsAt !== undefined
              ? { endsAt: input.endsAt ? new Date(input.endsAt) : null }
              : {}),
            ...(input.active !== undefined ? { active: input.active } : {})
          }
        })
      : await prisma.lawyerFeaturedSubscription.create({
          data: {
            lawyerId: z.string().min(1).parse(input.lawyerId),
            tierId: z.string().min(1).parse(input.tierId),
            startsAt: input.startsAt ? new Date(input.startsAt) : new Date(),
            endsAt: input.endsAt ? new Date(input.endsAt) : null,
            active: input.active ?? true
          }
        });

    await writeAudit(prisma, {
      userId: admin.id,
      action: input.id
        ? "FEATURED_SUBSCRIPTION_UPDATE"
        : "FEATURED_SUBSCRIPTION_CREATE",
      entityType: "FEATURED_SUBSCRIPTION",
      entityId: subscription.id,
      details: {
        lawyerId: subscription.lawyerId,
        tierId: subscription.tierId,
        active: subscription.active
      }
    });

    return NextResponse.json({ ok: true, subscription });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    return NextResponse.json(
      { error: "تنظیم سطح ویژه انجام نشد." },
      { status: 400 }
    );
  }
}
