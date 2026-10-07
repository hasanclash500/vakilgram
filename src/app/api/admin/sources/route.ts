import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";

const createSchema = z.object({
  name: z.string().trim().min(2).max(150),
  baseUrl: z.string().trim().url().max(500).nullable().optional(),
  sourceType: z.string().trim().min(2).max(80),
  official: z.boolean().default(true),
  enabled: z.boolean().default(true)
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    const input = createSchema.parse(await request.json());
    const prisma = getPrisma();

    const source = await prisma.source.create({
      data: {
        name: input.name,
        baseUrl: input.baseUrl ?? null,
        sourceType: input.sourceType,
        official: input.official,
        enabled: input.enabled
      }
    });

    await writeAudit(prisma, {
      userId: admin.id,
      action: "SOURCE_CREATE",
      entityType: "SOURCE",
      entityId: source.id,
      details: {
        name: source.name,
        sourceType: source.sourceType,
        official: source.official
      }
    });

    return NextResponse.json({ ok: true, source }, { status: 201 });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "اطلاعات منبع نامعتبر است.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "ایجاد منبع انجام نشد." },
      { status: 400 }
    );
  }
}
