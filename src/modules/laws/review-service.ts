import { createHash } from "node:crypto";
import type {
  Prisma,
  PrismaClient
} from "@/generated/prisma/client";
import { normalizePersian } from "@/lib/text/normalize-persian";
import { JsonLawAdapter } from "./adapters/json";
import type { LawDocumentStatus } from "./adapters/types";
import { indexArticles } from "./indexing-service";

export type ReviewDecision = "approve" | "reject";

export class LawReviewError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "LawReviewError";
  }
}

function objectValue(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new LawReviewError("INVALID_REVIEW_PAYLOAD");
  }

  return value as Record<string, unknown>;
}

function requiredString(
  value: Record<string, unknown>,
  key: string
): string {
  const item = value[key];
  if (typeof item !== "string" || !item) {
    throw new LawReviewError("INVALID_REVIEW_PAYLOAD");
  }
  return item;
}

function nullableString(
  value: Record<string, unknown>,
  key: string
): string | null | undefined {
  const item = value[key];
  if (item === undefined) return undefined;
  if (item === null) return null;
  if (typeof item === "string") return item;
  throw new LawReviewError("INVALID_REVIEW_PAYLOAD");
}

function optionalNumber(
  value: Record<string, unknown>,
  key: string
): number | undefined {
  const item = value[key];
  if (item === undefined) return undefined;
  if (typeof item === "number" && Number.isInteger(item)) return item;
  throw new LawReviewError("INVALID_REVIEW_PAYLOAD");
}

function checksum(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function asDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value) : null;
}

function statusValue(value: unknown): LawDocumentStatus | undefined {
  if (value === undefined) return undefined;
  if (
    value === "ACTIVE" ||
    value === "AMENDED" ||
    value === "REPEALED" ||
    value === "UNKNOWN"
  ) {
    return value;
  }
  throw new LawReviewError("INVALID_REVIEW_PAYLOAD");
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function requireOfficialLaw(
  tx: Prisma.TransactionClient,
  lawId: string
) {
  const law = await tx.law.findFirst({
    where: {
      id: lawId,
      source: {
        official: true,
        enabled: true
      }
    },
    select: { id: true, sourceId: true }
  });

  if (!law) {
    throw new LawReviewError("SOURCE_NOT_AVAILABLE");
  }

  return law;
}

async function finishRunIfResolved(
  prisma: PrismaClient,
  runId: string | null
) {
  if (!runId) return;

  const [pending, failed] = await Promise.all([
    prisma.ingestionItem.count({
      where: { runId, status: "NEEDS_REVIEW" }
    }),
    prisma.ingestionItem.count({
      where: { runId, status: "FAILED" }
    })
  ]);

  if (pending > 0) return;

  await prisma.ingestionRun.update({
    where: { id: runId },
    data: {
      status: failed > 0 ? "FAILED" : "SUCCEEDED",
      finishedAt: new Date()
    }
  });
}

export async function reviewStagedLawChange(
  prisma: PrismaClient,
  reviewId: string,
  reviewerId: string,
  decision: ReviewDecision
) {
  const applied = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM review_queue
      WHERE id = ${reviewId}
      FOR UPDATE
    `;

    const review = await tx.reviewQueue.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      throw new LawReviewError("REVIEW_NOT_FOUND");
    }

    if (review.status !== "PENDING") {
      throw new LawReviewError("REVIEW_ALREADY_RESOLVED");
    }

    if (!review.kind.endsWith("_STAGED")) {
      throw new LawReviewError("LEGACY_REVIEW_READ_ONLY");
    }

    const after = objectValue(review.afterData);
    const ingestionItemId =
      typeof after.ingestionItemId === "string"
        ? after.ingestionItemId
        : null;

    let runId: string | null = null;
    const articleIds: string[] = [];

    if (decision === "approve") {
      if (review.kind === "ARTICLE_UPDATE_STAGED") {
        const articleId = requiredString(after, "articleId");
        const lawId = requiredString(after, "lawId");
        await requireOfficialLaw(tx, lawId);

        const article = await tx.article.findUnique({
          where: { id: articleId }
        });

        if (!article) {
          throw new LawReviewError("ARTICLE_NOT_FOUND");
        }

        const expectedChecksum = requiredString(
          after,
          "expectedChecksum"
        );
        const expectedVersion = optionalNumber(
          after,
          "expectedVersion"
        );

        if (
          article.checksum !== expectedChecksum ||
          article.currentVersion !== expectedVersion
        ) {
          throw new LawReviewError("STALE_REVIEW");
        }

        const text = requiredString(after, "text");
        const normalizedText = normalizePersian(text);
        const nextChecksum = checksum(normalizedText);
        const nextVersion = article.currentVersion + 1;

        await tx.articleVersion.create({
          data: {
            articleId,
            version: nextVersion,
            text,
            checksum: nextChecksum,
            sourceUrl: nullableString(after, "sourceUrl") ?? null
          }
        });

        await tx.article.update({
          where: { id: articleId },
          data: {
            title: nullableString(after, "title") ?? null,
            text,
            normalizedText,
            sourceUrl: nullableString(after, "sourceUrl") ?? null,
            checksum: nextChecksum,
            currentVersion: nextVersion
          }
        });

        articleIds.push(articleId);
      } else if (review.kind === "ARTICLE_CREATE_STAGED") {
        const lawId = requiredString(after, "lawId");
        await requireOfficialLaw(tx, lawId);

        const number = requiredString(after, "number");
        const exists = await tx.article.findUnique({
          where: {
            lawId_number: {
              lawId,
              number
            }
          },
          select: { id: true }
        });

        if (exists) {
          throw new LawReviewError("STALE_REVIEW");
        }

        const text = requiredString(after, "text");
        const normalizedText = normalizePersian(text);
        const nextChecksum = checksum(normalizedText);

        const article = await tx.article.create({
          data: {
            lawId,
            number,
            title: nullableString(after, "title") ?? null,
            text,
            normalizedText,
            sourceUrl: nullableString(after, "sourceUrl") ?? null,
            checksum: nextChecksum,
            currentVersion: 1
          }
        });

        await tx.articleVersion.create({
          data: {
            articleId: article.id,
            version: 1,
            text,
            checksum: nextChecksum,
            sourceUrl: nullableString(after, "sourceUrl") ?? null
          }
        });

        articleIds.push(article.id);
      } else if (
        review.kind === "LAW_METADATA_UPDATE_STAGED"
      ) {
        const lawId = requiredString(after, "lawId");
        await requireOfficialLaw(tx, lawId);

        const update: Prisma.LawUpdateInput = {};
        const title = nullableString(after, "title");
        const sourceUrl = nullableString(after, "sourceUrl");
        const enactedAt = nullableString(after, "enactedAt");
        const effectiveAt = nullableString(after, "effectiveAt");
        const status = statusValue(after.status);

        if (title !== undefined) {
          if (title === null || title.trim().length < 1) {
            throw new LawReviewError("INVALID_REVIEW_PAYLOAD");
          }
          update.title = title;
        }
        if (sourceUrl !== undefined) update.sourceUrl = sourceUrl;
        if (enactedAt !== undefined) update.enactedAt = asDate(enactedAt);
        if (effectiveAt !== undefined) {
          update.effectiveAt = asDate(effectiveAt);
        }
        if (status !== undefined) update.status = status;

        await tx.law.update({
          where: { id: lawId },
          data: update
        });
      } else if (review.kind === "LAW_CREATE_STAGED") {
        const sourceId = requiredString(after, "sourceId");
        const source = await tx.source.findFirst({
          where: {
            id: sourceId,
            official: true,
            enabled: true
          },
          select: { id: true }
        });

        if (!source) {
          throw new LawReviewError("SOURCE_NOT_AVAILABLE");
        }

        const documents = await new JsonLawAdapter().parse(
          after.document
        );
        const document = documents[0];

        if (!document || documents.length !== 1) {
          throw new LawReviewError("INVALID_REVIEW_PAYLOAD");
        }

        const existing = await tx.law.findUnique({
          where: { slug: document.slug },
          select: { id: true }
        });

        if (existing) {
          throw new LawReviewError("STALE_REVIEW");
        }

        const law = await tx.law.create({
          data: {
            sourceId,
            title: document.title,
            slug: document.slug,
            sourceUrl: document.sourceUrl ?? null,
            enactedAt: asDate(document.enactedAt) ?? null,
            effectiveAt: asDate(document.effectiveAt) ?? null,
            status: document.status ?? "UNKNOWN",
            metadata: document.metadata
              ? jsonValue(document.metadata)
              : undefined
          }
        });

        for (const input of document.articles) {
          const normalizedText = normalizePersian(input.text);
          const nextChecksum = checksum(normalizedText);
          const article = await tx.article.create({
            data: {
              lawId: law.id,
              number: input.number,
              title: input.title ?? null,
              text: input.text,
              normalizedText,
              sourceUrl:
                input.sourceUrl ?? document.sourceUrl ?? null,
              checksum: nextChecksum,
              currentVersion: 1
            }
          });

          await tx.articleVersion.create({
            data: {
              articleId: article.id,
              version: 1,
              text: input.text,
              checksum: nextChecksum,
              sourceUrl:
                input.sourceUrl ?? document.sourceUrl ?? null
            }
          });

          articleIds.push(article.id);
        }
      } else {
        throw new LawReviewError("UNSUPPORTED_REVIEW_KIND");
      }
    }

    await tx.reviewQueue.update({
      where: { id: reviewId },
      data: {
        status: decision === "approve" ? "APPROVED" : "REJECTED",
        reviewedById: reviewerId,
        reviewedAt: new Date()
      }
    });

    if (ingestionItemId) {
      const item = await tx.ingestionItem.update({
        where: { id: ingestionItemId },
        data: {
          status: "SUCCEEDED",
          error:
            decision === "reject"
              ? "REJECTED_BY_ADMIN"
              : null
        },
        select: { runId: true }
      });

      runId = item.runId;
    }

    return { articleIds, runId };
  });

  if (applied.articleIds.length > 0) {
    await indexArticles(prisma, applied.articleIds);
  }

  await finishRunIfResolved(prisma, applied.runId);

  return {
    ok: true,
    decision,
    indexedArticles: applied.articleIds.length
  };
}
