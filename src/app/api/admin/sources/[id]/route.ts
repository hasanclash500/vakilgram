import { NextResponse } from "next/server";
import { z } from "zod";
import { isHttpUrl } from "@/lib/url/http";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";
import {
  mergeSourceAdapterConfig,
  readSourceAdapterConfig
} from "@/modules/laws/source-adapter-config";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  baseUrl: z
    .string()
    .trim()
    .url()
    .max(500)
    .refine(isHttpUrl, "URL must use HTTP(S)")
    .nullable()
    .optional(),
  sourceType: z.string().trim().min(2).max(80).optional(),
  official: z.boolean().optional(),
  enabled: z.boolean().optional(),
  adapterFormat: z.enum(["json", "csv"]).nullable().optional(),
  updateUrl: z
    .string()
    .trim()
    .url()
    .max(1000)
    .refine(isHttpUrl, "URL must use HTTP(S)")
    .nullable()
    .optional()
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

    const existing = await prisma.source.findUnique({
      where: { id },
      select: { id: true, config: true }
    });

    if (!existing) {
      return NextResponse.json(
        { error: "منبع پیدا نشد." },
        { status: 404 }
      );
    }

    const adapterTouched =
      input.adapterFormat !== undefined ||
      input.updateUrl !== undefined;

    const currentAdapter = readSourceAdapterConfig(existing.config);
    const adapterFormat =
      input.adapterFormat !== undefined
        ? input.adapterFormat
        : currentAdapter?.format ?? null;
    const updateUrl =
      input.updateUrl !== undefined
        ? input.updateUrl
        : currentAdapter?.updateUrl ?? null;

    if (
      adapterTouched &&
      ((adapterFormat === null) !== (updateUrl === null))
    ) {
      return NextResponse.json(
        {
          error:
            "فرمت adapter و نشانی به‌روزرسانی باید هر دو تنظیم یا هر دو پاک شوند."
        },
        { status: 400 }
      );
    }

    const source = await prisma.source.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.baseUrl !== undefined
          ? { baseUrl: input.baseUrl }
          : {}),
        ...(input.sourceType !== undefined
          ? { sourceType: input.sourceType }
          : {}),
        ...(input.official !== undefined
          ? { official: input.official }
          : {}),
        ...(input.enabled !== undefined
          ? { enabled: input.enabled }
          : {}),
        ...(adapterTouched
          ? {
              config: mergeSourceAdapterConfig(existing.config, {
                format: adapterFormat,
                updateUrl
              })
            }
          : {})
      }
    });

    await writeAudit(prisma, {
      userId: admin.id,
      action: "SOURCE_UPDATE",
      entityType: "SOURCE",
      entityId: source.id,
      details: { changedFields: Object.keys(input) }
    });

    return NextResponse.json({
      ok: true,
      source,
      adapter: readSourceAdapterConfig(source.config)
    });
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
