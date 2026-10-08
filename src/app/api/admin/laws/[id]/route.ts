import { NextResponse } from "next/server";
import { z } from "zod";
import { isHttpUrl } from "@/lib/url/http";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";

const schema = z.object({
  title: z.string().trim().min(2).max(300).optional(),
  sourceUrl: z.string().trim().url().max(500).refine(isHttpUrl, "URL must use HTTP(S)").nullable().optional(),
  enactedAt: z.string().date().nullable().optional(),
  effectiveAt: z.string().date().nullable().optional(),
  status: z
    .enum(["ACTIVE", "AMENDED", "REPEALED", "UNKNOWN"])
    .optional()
});

function toDate(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(value + "T00:00:00.000Z");
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const prisma = getPrisma();

    const law = await prisma.law.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.sourceUrl !== undefined
          ? { sourceUrl: input.sourceUrl }
          : {}),
        ...(input.enactedAt !== undefined
          ? { enactedAt: toDate(input.enactedAt) }
          : {}),
        ...(input.effectiveAt !== undefined
          ? { effectiveAt: toDate(input.effectiveAt) }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {})
      },
      select: {
        id: true,
        title: true,
        slug: true,
        sourceUrl: true,
        enactedAt: true,
        effectiveAt: true,
        status: true,
        updatedAt: true
      }
    });

    await writeAudit(prisma, {
      userId: admin.id,
      action: "LAW_METADATA_UPDATE",
      entityType: "LAW",
      entityId: id,
      details: {
        changedFields: Object.keys(input)
      }
    });

    return NextResponse.json({ ok: true, law });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "اطلاعات قانون نامعتبر است.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "به‌روزرسانی قانون انجام نشد." },
      { status: 400 }
    );
  }
}
