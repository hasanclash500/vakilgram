import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  priority: z.number().int().min(0).max(10000),
  costPerClick: z.string().regex(/^\d+$/),
  active: z.boolean().default(true)
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    const input = schema.parse(await request.json());
    const prisma = getPrisma();

    const tier = await prisma.featuredTier.create({
      data: {
        name: input.name,
        priority: input.priority,
        costPerClick: BigInt(input.costPerClick),
        active: input.active
      }
    });

    await writeAudit(prisma, {
      userId: admin.id,
      action: "FEATURED_TIER_CREATE",
      entityType: "FEATURED_TIER",
      entityId: tier.id,
      details: {
        name: tier.name,
        priority: tier.priority,
        costPerClick: tier.costPerClick.toString()
      }
    });

    return NextResponse.json(
      {
        ok: true,
        tier: {
          ...tier,
          costPerClick: tier.costPerClick.toString()
        }
      },
      { status: 201 }
    );
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    return NextResponse.json(
      { error: "ساخت سطح ویژه انجام نشد." },
      { status: 400 }
    );
  }
}
