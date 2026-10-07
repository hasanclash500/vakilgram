import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";

const schema = z.object({
  voiceEnabled: z.boolean(),
  disclaimer: z.string().trim().min(20).max(1200)
});

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminUser();
    const input = schema.parse(await request.json());
    const prisma = getPrisma();

    await prisma.$transaction([
      prisma.setting.upsert({
        where: { key: "feature.voice" },
        update: { value: input.voiceEnabled },
        create: { key: "feature.voice", value: input.voiceEnabled }
      }),
      prisma.setting.upsert({
        where: { key: "legal.disclaimer" },
        update: { value: input.disclaimer },
        create: { key: "legal.disclaimer", value: input.disclaimer }
      })
    ]);

    await writeAudit(prisma, {
      userId: admin.id,
      action: "RUNTIME_SETTINGS_UPDATE",
      entityType: "SETTING",
      details: {
        voiceEnabled: input.voiceEnabled,
        disclaimerLength: input.disclaimer.length
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "تنظیمات نامعتبر است.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "ذخیره تنظیمات انجام نشد." },
      { status: 400 }
    );
  }
}
