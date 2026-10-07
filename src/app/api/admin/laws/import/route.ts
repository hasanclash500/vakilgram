import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";
import { JsonLawAdapter } from "@/modules/laws/adapters/json";
import { importLawDocument } from "@/modules/laws/import-service";

const bodySchema = z.object({
  sourceId: z.string().min(1),
  payload: z.unknown()
});

const MAX_BODY_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    const rawBody = await request.text();

    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "حجم فایل/داده بیشتر از ۲ مگابایت است." },
        { status: 413 }
      );
    }

    const parsedBody = bodySchema.parse(JSON.parse(rawBody));
    const adapter = new JsonLawAdapter();
    const documents = await adapter.parse(parsedBody.payload);

    const prisma = getPrisma();
    const results = [];

    for (const document of documents) {
      results.push(
        await importLawDocument(prisma, parsedBody.sourceId, document)
      );
    }

    await writeAudit(prisma, {
      userId: admin.id,
      action: "LAW_IMPORT",
      entityType: "LAW",
      details: {
        sourceId: parsedBody.sourceId,
        documents: results.length,
        createdArticles: results.reduce(
          (sum, item) => sum + item.createdArticles,
          0
        ),
        updatedArticles: results.reduce(
          (sum, item) => sum + item.updatedArticles,
          0
        )
      }
    });

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    const accessResponse = adminAccessError(error);
    if (accessResponse) return accessResponse;

    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "ساختار JSON نامعتبر است." },
        { status: 400 }
      );
    }

    console.error("admin-law-import-failed", {
      message: error instanceof Error ? error.message : "unknown"
    });

    return NextResponse.json(
      { error: "ورود قانون انجام نشد." },
      { status: 400 }
    );
  }
}
