import { createHash } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { normalizePersian } from "@/lib/text/normalize-persian";
import type { LawDocumentInput } from "./adapters/types";

function checksum(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function asDate(value?: string | null): Date | null {
  return value ? new Date(value) : null;
}

export interface ImportLawResult {
  lawId: string;
  createdArticles: number;
  updatedArticles: number;
  unchangedArticles: number;
}

export async function importLawDocument(
  prisma: PrismaClient,
  sourceId: string,
  document: LawDocumentInput
): Promise<ImportLawResult> {
  return prisma.$transaction(async (tx) => {
    const source = await tx.source.findFirst({
      where: {
        id: sourceId,
        official: true,
        enabled: true
      },
      select: { id: true }
    });

    if (!source) {
      throw new Error("Official source is not enabled");
    }

    const law = await tx.law.upsert({
      where: { slug: document.slug },
      update: {
        title: document.title,
        sourceId,
        sourceUrl: document.sourceUrl ?? null,
        enactedAt: asDate(document.enactedAt),
        effectiveAt: asDate(document.effectiveAt),
        metadata: document.metadata
      },
      create: {
        title: document.title,
        slug: document.slug,
        sourceId,
        sourceUrl: document.sourceUrl ?? null,
        enactedAt: asDate(document.enactedAt),
        effectiveAt: asDate(document.effectiveAt),
        metadata: document.metadata
      }
    });

    let createdArticles = 0;
    let updatedArticles = 0;
    let unchangedArticles = 0;

    for (const input of document.articles) {
      const normalizedText = normalizePersian(input.text);
      const nextChecksum = checksum(normalizedText);

      const existing = await tx.article.findUnique({
        where: {
          lawId_number: {
            lawId: law.id,
            number: input.number
          }
        }
      });

      if (!existing) {
        const created = await tx.article.create({
          data: {
            lawId: law.id,
            number: input.number,
            title: input.title ?? null,
            text: input.text,
            normalizedText,
            sourceUrl: input.sourceUrl ?? document.sourceUrl ?? null,
            checksum: nextChecksum,
            currentVersion: 1
          }
        });

        await tx.articleVersion.create({
          data: {
            articleId: created.id,
            version: 1,
            text: input.text,
            checksum: nextChecksum,
            sourceUrl:
              input.sourceUrl ?? document.sourceUrl ?? null
          }
        });

        createdArticles += 1;
        continue;
      }

      if (existing.checksum === nextChecksum) {
        unchangedArticles += 1;
        continue;
      }

      const nextVersion = existing.currentVersion + 1;

      await tx.articleVersion.create({
        data: {
          articleId: existing.id,
          version: nextVersion,
          text: input.text,
          checksum: nextChecksum,
          sourceUrl:
            input.sourceUrl ?? document.sourceUrl ?? null
        }
      });

      await tx.article.update({
        where: { id: existing.id },
        data: {
          title: input.title ?? null,
          text: input.text,
          normalizedText,
          sourceUrl:
            input.sourceUrl ?? document.sourceUrl ?? null,
          checksum: nextChecksum,
          currentVersion: nextVersion
        }
      });

      await tx.reviewQueue.create({
        data: {
          kind: "ARTICLE_UPDATE",
          entityId: existing.id,
          beforeData: {
            checksum: existing.checksum,
            version: existing.currentVersion
          },
          afterData: {
            checksum: nextChecksum,
            version: nextVersion
          }
        }
      });

      updatedArticles += 1;
    }

    return {
      lawId: law.id,
      createdArticles,
      updatedArticles,
      unchangedArticles
    };
  });
}
