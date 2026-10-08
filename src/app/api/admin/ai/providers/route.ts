import { NextResponse } from "next/server";
import { z } from "zod";
import { isHttpUrl } from "@/lib/url/http";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";

const schema = z.object({
  kind: z.enum(["LLM", "EMBEDDING"]),
  name: z.string().trim().min(2).max(100),
  baseUrl: z.string().trim().url().max(500).refine(isHttpUrl, "URL must use HTTP(S)"),
  model: z.string().trim().min(1).max(200),
  apiKeyEnv: z
    .string()
    .trim()
    .regex(/^[A-Z][A-Z0-9_]{1,99}$/)
    .nullable()
    .optional(),
  position: z.number().int().min(0).max(100),
  timeoutMs: z.number().int().min(1000).max(120000).default(15000),
  enabled: z.boolean().default(false)
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    const input = schema.parse(await request.json());
    const prisma = getPrisma();

    const provider = await prisma.aiProviderConfig.create({
      data: input
    });

    await writeAudit(prisma, {
      userId: admin.id,
      action: "AI_PROVIDER_CREATE",
      entityType: "AI_PROVIDER",
      entityId: provider.id,
      details: {
        kind: provider.kind,
        name: provider.name,
        model: provider.model,
        enabled: provider.enabled
      }
    });

    return NextResponse.json({ ok: true, provider }, { status: 201 });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "اطلاعات Provider نامعتبر است.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "ساخت Provider انجام نشد." },
      { status: 400 }
    );
  }
}
