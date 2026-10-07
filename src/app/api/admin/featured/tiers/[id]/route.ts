import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";

const schema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  priority: z.number().int().min(0).max(10000).optional(),
  costPerClick: z.string().regex(/^\d+$/).optional(),
  active: z.boolean().optional()
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const prisma = getPrisma();

    const tier = await prisma.featuredTier.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.costPerClick !== undefined
          ? { costPerClick: BigInt(input.costPerClick) }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {})
      }
    });

    await writeAudit(prisma, {
      userId: admin.id,
      action: "FEATURED_TIER_UPDATE",
      entityType: "FEATURED_TIER",
      entityId: id,
      details: { changedFields: Object.keys(input) }
    });

    return NextResponse.json({
      ok: true,
      tier: {
        ...tier,
        costPerClick: tier.costPerClick.toString()
      }
    });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;
    return NextResponse.json(
      { error: "به‌روزرسانی سطح ویژه انجام نشد." },
      { status: 400 }
    );
  }
}
