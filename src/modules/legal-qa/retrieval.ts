import type { PrismaClient } from "@/generated/prisma/client";
import { loadEmbeddingProviders } from "@/providers/embedding/registry";
import { reciprocalRankFusion } from "./rrf";
import type { RetrievedArticle } from "./types";

type ArticleRow = {
  id: string;
  lawId: string;
  lawTitle: string;
  number: string;
  title: string | null;
  text: string;
  sourceUrl: string | null;
};

type TextRow = ArticleRow & {
  score: number;
};

export async function retrieveByText(
  prisma: PrismaClient,
  normalizedQuestion: string,
  limit = 20
): Promise<RetrievedArticle[]> {
  const rows = await prisma.$queryRaw<TextRow[]>`
    SELECT
      a.id,
      a."lawId" AS "lawId",
      l.title AS "lawTitle",
      a.number,
      a.title,
      a.text,
      a."sourceUrl" AS "sourceUrl",
      ts_rank_cd(
        COALESCE(a.search_vector, to_tsvector('simple', a."normalizedText")),
        plainto_tsquery('simple', ${normalizedQuestion})
      ) AS score
    FROM articles a
    JOIN laws l ON l.id = a."lawId"
    WHERE
      COALESCE(a.search_vector, to_tsvector('simple', a."normalizedText"))
      @@ plainto_tsquery('simple', ${normalizedQuestion})
    ORDER BY score DESC
    LIMIT ${limit}
  `;

  return rows.map((row, index) => ({
    ...row,
    rank: index + 1
  }));
}

async function retrieveByVector(
  prisma: PrismaClient,
  embedding: number[],
  limit = 20
): Promise<RetrievedArticle[]> {
  if (
    embedding.length === 0 ||
    embedding.some((value) => !Number.isFinite(value))
  ) {
    return [];
  }

  const vectorLiteral = `[${embedding.join(",")}]`;

  const rows = await prisma.$queryRaw<ArticleRow[]>`
    SELECT
      a.id,
      a."lawId" AS "lawId",
      l.title AS "lawTitle",
      a.number,
      a.title,
      a.text,
      a."sourceUrl" AS "sourceUrl"
    FROM articles a
    JOIN laws l ON l.id = a."lawId"
    WHERE a.embedding IS NOT NULL
    ORDER BY a.embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `;

  return rows.map((row, index) => ({
    ...row,
    rank: index + 1
  }));
}

export async function retrieveHybrid(
  prisma: PrismaClient,
  normalizedQuestion: string,
  limit = 12
): Promise<RetrievedArticle[]> {
  const textRanking = await retrieveByText(
    prisma,
    normalizedQuestion,
    Math.max(limit, 20)
  );

  const embeddingProviders = await loadEmbeddingProviders(prisma);
  if (embeddingProviders.length === 0) {
    return textRanking.slice(0, limit);
  }

  let vectorRanking: RetrievedArticle[] = [];

  for (const provider of embeddingProviders) {
    try {
      const embedding = await provider.embed(normalizedQuestion);
      vectorRanking = await retrieveByVector(
        prisma,
        embedding,
        Math.max(limit, 20)
      );
      if (vectorRanking.length > 0) break;
    } catch {
      // Embedding is optional. Text retrieval remains the safe fallback.
    }
  }

  if (vectorRanking.length === 0) {
    return textRanking.slice(0, limit);
  }

  const scores = reciprocalRankFusion([
    textRanking.map(({ id, rank }) => ({ id, rank })),
    vectorRanking.map(({ id, rank }) => ({ id, rank }))
  ]);

  const articleById = new Map<string, RetrievedArticle>();
  for (const article of [...textRanking, ...vectorRanking]) {
    if (!articleById.has(article.id)) {
      articleById.set(article.id, article);
    }
  }

  return [...articleById.values()]
    .sort(
      (a, b) =>
        (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0)
    )
    .slice(0, limit)
    .map((article, index) => ({
      ...article,
      rank: index + 1
    }));
}
