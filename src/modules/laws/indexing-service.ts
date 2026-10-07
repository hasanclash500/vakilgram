import type { PrismaClient } from "@/generated/prisma/client";
import { loadConfiguredEmbeddingProviders } from "@/providers/embedding/registry";

export interface ArticleIndexingResult {
  textIndexed: number;
  embeddingIndexed: number;
}

async function recordEmbeddingUsage(
  prisma: PrismaClient,
  input: {
    providerConfigId: string;
    success: boolean;
    latencyMs: number;
    errorCode?: string;
  }
): Promise<void> {
  try {
    await prisma.aiUsageLog.create({
      data: {
        providerConfigId: input.providerConfigId,
        kind: "EMBEDDING",
        success: input.success,
        latencyMs: input.latencyMs,
        errorCode: input.errorCode?.slice(0, 120) ?? null
      }
    });
  } catch {
    // Indexing observability is best-effort.
  }
}

function vectorLiteral(embedding: number[]): string {
  if (
    embedding.length === 0 ||
    embedding.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("Invalid embedding vector");
  }

  return `[${embedding.join(",")}]`;
}

export async function indexArticles(
  prisma: PrismaClient,
  articleIds: readonly string[]
): Promise<ArticleIndexingResult> {
  const ids = [...new Set(articleIds)];
  if (ids.length === 0) {
    return { textIndexed: 0, embeddingIndexed: 0 };
  }

  let textIndexed = 0;
  let embeddingIndexed = 0;

  for (const id of ids) {
    await prisma.$executeRaw`
      UPDATE articles
      SET search_vector = to_tsvector('simple', "normalizedText")
      WHERE id = ${id}
    `;
    textIndexed += 1;
  }

  const providers = await loadConfiguredEmbeddingProviders(prisma);
  if (providers.length === 0) {
    return { textIndexed, embeddingIndexed };
  }

  const articles = await prisma.article.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      normalizedText: true
    }
  });

  for (const article of articles) {
    for (const entry of providers) {
      const startedAt = Date.now();

      try {
        const embedding = await entry.provider.embed(article.normalizedText);
        const literal = vectorLiteral(embedding);

        await prisma.$executeRaw`
          UPDATE articles
          SET embedding = ${literal}::vector
          WHERE id = ${article.id}
        `;

        await recordEmbeddingUsage(prisma, {
          providerConfigId: entry.configId,
          success: true,
          latencyMs: Date.now() - startedAt
        });

        embeddingIndexed += 1;
        break;
      } catch (error) {
        await recordEmbeddingUsage(prisma, {
          providerConfigId: entry.configId,
          success: false,
          latencyMs: Date.now() - startedAt,
          errorCode:
            error instanceof Error ? error.message : "unknown error"
        });
      }
    }
  }

  return {
    textIndexed,
    embeddingIndexed
  };
}
