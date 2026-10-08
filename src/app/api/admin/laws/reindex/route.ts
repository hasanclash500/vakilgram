import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";
import { indexArticles } from "@/modules/laws/indexing-service";

const schema = z.object({
  cursor: z.string().min(1).optional(),
  batchSize: z.number().int().min(1).max(25).default(10)
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    const input = schema.parse(await request.json());
    const prisma = getPrisma();

    const rows = await prisma.article.findMany({
      where: {
        law: {
          source: {
            official: true,
            enabled: true
          }
        }
      },
      orderBy: { id: "asc" },
      take: input.batchSize + 1,
      ...(input.cursor
        ? {
            cursor: { id: input.cursor },
            skip: 1
          }
        : {}),
      select: { id: true }
    });

    const hasMore = rows.length > input.batchSize;
    const batch = rows.slice(0, input.batchSize);
    const articleIds = batch.map((item) => item.id);
    const result = await indexArticles(prisma, articleIds);
    const nextCursor =
      hasMore && batch.length > 0
        ? batch[batch.length - 1]!.id
        : null;

    await writeAudit(prisma, {
      userId: admin.id,
      action: "LAW_REINDEX_BATCH",
      entityType: "ARTICLE",
      details: {
        count: articleIds.length,
        textIndexed: result.textIndexed,
        embeddingIndexed: result.embeddingIndexed,
        hasMore
      }
    });

    return NextResponse.json({
      ok: true,
      batchCount: articleIds.length,
      textIndexed: result.textIndexed,
      embeddingIndexed: result.embeddingIndexed,
      nextCursor
    });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "پارامتر بازسازی ایندکس نامعتبر است." },
        { status: 400 }
      );
    }

    console.error("law-reindex-failed", {
      message: error instanceof Error ? error.message : "unknown"
    });

    return NextResponse.json(
      { error: "بازسازی ایندکس انجام نشد." },
      { status: 503 }
    );
  }
}
