import type { PrismaClient } from "@/generated/prisma/client";
import type { RetrievedArticle } from "./types";

type TextRow = {
  id: string;
  lawId: string;
  lawTitle: string;
  number: string;
  title: string | null;
  text: string;
  sourceUrl: string | null;
  score: number;
};

export async function retrieveByText(
  prisma: PrismaClient,
  normalizedQuestion: string,
  limit = 12
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
