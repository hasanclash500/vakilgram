import { NextResponse } from "next/server";
import { z } from "zod";
import { isHttpUrl } from "@/lib/url/http";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  baseUrl: z.string().trim().url().max(500).refine(isHttpUrl, "URL must use HTTP(S)").nullable().optional(),
  sourceType: z.string().trim().min(2).max(80).optional(),
  official: z.boolean().optional(),
  enabled: z.boolean().optional()
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await context.params;
    const input = updateSchema.parse(await request.json());
    const prisma = getPrisma();

    const source = await prisma.source.update({
      where: { id },
      data: input
    });

    await writeAudit(prisma, {
      userId: admin.id,
      action: "SOURCE_UPDATE",
      entityType: "SOURCE",
      entityId: source.id,
      details: { changedFields: Object.keys(input) }
    });

    return NextResponse.json({ ok: true, source });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "اطلاعات منبع نامعتبر است." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "به‌روزرسانی منبع انجام نشد." },
      { status: 400 }
    );
  }
}
