import { NextResponse } from "next/server";
import { z } from "zod";
import { isHttpUrl } from "@/lib/url/http";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().trim().min(1).max(100).optional(),
  baseUrl: z.string().trim().url().max(500).refine(isHttpUrl, "URL must use HTTP(S)").optional(),
  model: z.string().trim().min(1).max(200).optional(),
  apiKeyEnv: z
    .string()
    .trim()
    .regex(/^[A-Z][A-Z0-9_]{1,99}$/)
    .nullable()
    .optional(),
  position: z.number().int().min(0).max(100).optional(),
  timeoutMs: z.number().int().min(1000).max(120000).optional()
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

    const updated = await prisma.aiProviderConfig.update({
      where: { id },
      data: input,
      select: {
        id: true,
        kind: true,
        name: true,
        baseUrl: true,
        model: true,
        apiKeyEnv: true,
        position: true,
        enabled: true,
        timeoutMs: true
      }
    });

    await writeAudit(prisma, {
      userId: admin.id,
      action: "AI_PROVIDER_UPDATE",
      entityType: "AI_PROVIDER",
      entityId: id,
      details: {
        changedFields: Object.keys(input)
      }
    });

    return NextResponse.json({ ok: true, provider: updated });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "تنظیمات Provider نامعتبر است.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "ذخیره تنظیمات Provider انجام نشد." },
      { status: 400 }
    );
  }
}
