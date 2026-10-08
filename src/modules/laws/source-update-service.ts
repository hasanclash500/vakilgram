import { createHash } from "node:crypto";
import type {
  Prisma,
  PrismaClient
} from "@/generated/prisma/client";
import { normalizePersian } from "@/lib/text/normalize-persian";
import { CsvLawAdapter } from "./adapters/csv";
import { JsonLawAdapter } from "./adapters/json";
import type { LawDocumentInput } from "./adapters/types";
import {
  readSourceAdapterConfig,
  type SourceAdapterConfig
} from "./source-adapter-config";

const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15000;

export class SourceUpdateError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "SourceUpdateError";
  }
}

export interface StageUpdateResult {
  queued: number;
  unchanged: number;
  existingPending: number;
}

function checksum(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function asDate(value?: string | null): Date | null {
  return value ? new Date(value) : null;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function queueChange(
  tx: Prisma.TransactionClient,
  input: {
    runId: string;
    kind: string;
    entityId: string;
    externalId: string;
    beforeData?: Record<string, unknown> | null;
    afterData: Record<string, unknown>;
  }
): Promise<"queued" | "existing-pending"> {
  const pending = await tx.reviewQueue.findFirst({
    where: {
      kind: input.kind,
      entityId: input.entityId,
      status: "PENDING"
    },
    select: { id: true }
  });

  if (pending) {
    await tx.ingestionItem.create({
      data: {
        runId: input.runId,
        externalId: input.externalId,
        status: "SUCCEEDED",
        payload: jsonValue({
          skipped: "EXISTING_PENDING",
          reviewQueueId: pending.id
        })
      }
    });

    return "existing-pending";
  }

  const item = await tx.ingestionItem.create({
    data: {
      runId: input.runId,
      externalId: input.externalId,
      status: "NEEDS_REVIEW",
      payload: jsonValue(input.afterData)
    }
  });

  await tx.reviewQueue.create({
    data: {
      kind: input.kind,
      entityId: input.entityId,
      beforeData: input.beforeData
        ? jsonValue(input.beforeData)
        : undefined,
      afterData: jsonValue({
        ...input.afterData,
        ingestionItemId: item.id
      })
    }
  });

  return "queued";
}

export async function stageLawDocumentUpdate(
  prisma: PrismaClient,
  sourceId: string,
  runId: string,
  document: LawDocumentInput
): Promise<StageUpdateResult> {
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
      throw new SourceUpdateError("SOURCE_NOT_AVAILABLE");
    }

    const law = await tx.law.findUnique({
      where: { slug: document.slug },
      include: {
        articles: true
      }
    });

    let queued = 0;
    let unchanged = 0;
    let existingPending = 0;

    if (!law) {
      const result = await queueChange(tx, {
        runId,
        kind: "LAW_CREATE_STAGED",
        entityId: document.slug,
        externalId: document.slug,
        afterData: {
          sourceId,
          document
        }
      });

      return {
        queued: result === "queued" ? 1 : 0,
        unchanged: 0,
        existingPending: result === "existing-pending" ? 1 : 0
      };
    }

    if (law.sourceId !== sourceId) {
      throw new SourceUpdateError("LAW_SOURCE_MISMATCH");
    }

    const metadataAfter: Record<string, unknown> = {};
    const metadataBefore: Record<string, unknown> = {};

    if (document.title !== law.title) {
      metadataBefore.title = law.title;
      metadataAfter.title = document.title;
    }

    if (
      document.status !== undefined &&
      document.status !== law.status
    ) {
      metadataBefore.status = law.status;
      metadataAfter.status = document.status;
    }

    if (
      document.sourceUrl !== undefined &&
      document.sourceUrl !== law.sourceUrl
    ) {
      metadataBefore.sourceUrl = law.sourceUrl;
      metadataAfter.sourceUrl = document.sourceUrl;
    }

    if (document.enactedAt !== undefined) {
      const next = asDate(document.enactedAt);
      const current = law.enactedAt?.toISOString() ?? null;
      const nextIso = next?.toISOString() ?? null;

      if (current !== nextIso) {
        metadataBefore.enactedAt = current;
        metadataAfter.enactedAt = nextIso;
      }
    }

    if (document.effectiveAt !== undefined) {
      const next = asDate(document.effectiveAt);
      const current = law.effectiveAt?.toISOString() ?? null;
      const nextIso = next?.toISOString() ?? null;

      if (current !== nextIso) {
        metadataBefore.effectiveAt = current;
        metadataAfter.effectiveAt = nextIso;
      }
    }

    if (Object.keys(metadataAfter).length > 0) {
      const result = await queueChange(tx, {
        runId,
        kind: "LAW_METADATA_UPDATE_STAGED",
        entityId: law.id,
        externalId: document.slug + ":metadata",
        beforeData: {
          lawId: law.id,
          ...metadataBefore
        },
        afterData: {
          sourceId,
          lawId: law.id,
          ...metadataAfter
        }
      });

      queued += result === "queued" ? 1 : 0;
      existingPending += result === "existing-pending" ? 1 : 0;
    }

    const existingByNumber = new Map(
      law.articles.map((article) => [article.number, article])
    );

    for (const input of document.articles) {
      const existing = existingByNumber.get(input.number);
      const normalizedText = normalizePersian(input.text);
      const nextChecksum = checksum(normalizedText);

      if (!existing) {
        const result = await queueChange(tx, {
          runId,
          kind: "ARTICLE_CREATE_STAGED",
          entityId: law.id + "::" + input.number,
          externalId: document.slug + ":" + input.number,
          afterData: {
            sourceId,
            lawId: law.id,
            lawSlug: law.slug,
            number: input.number,
            title: input.title ?? null,
            text: input.text,
            normalizedText,
            sourceUrl:
              input.sourceUrl ?? document.sourceUrl ?? law.sourceUrl,
            checksum: nextChecksum
          }
        });

        queued += result === "queued" ? 1 : 0;
        existingPending += result === "existing-pending" ? 1 : 0;
        continue;
      }

      const nextTitle =
        input.title !== undefined ? input.title : existing.title;
      const nextSourceUrl =
        input.sourceUrl !== undefined
          ? input.sourceUrl
          : existing.sourceUrl;

      const changed =
        existing.checksum !== nextChecksum ||
        existing.title !== nextTitle ||
        existing.sourceUrl !== nextSourceUrl;

      if (!changed) {
        unchanged += 1;
        continue;
      }

      const result = await queueChange(tx, {
        runId,
        kind: "ARTICLE_UPDATE_STAGED",
        entityId: existing.id,
        externalId: document.slug + ":" + input.number,
        beforeData: {
          articleId: existing.id,
          title: existing.title,
          text: existing.text,
          sourceUrl: existing.sourceUrl,
          checksum: existing.checksum,
          currentVersion: existing.currentVersion
        },
        afterData: {
          sourceId,
          lawId: law.id,
          lawSlug: law.slug,
          articleId: existing.id,
          number: existing.number,
          title: nextTitle,
          text: input.text,
          normalizedText,
          sourceUrl: nextSourceUrl,
          checksum: nextChecksum,
          expectedChecksum: existing.checksum,
          expectedVersion: existing.currentVersion
        }
      });

      queued += result === "queued" ? 1 : 0;
      existingPending += result === "existing-pending" ? 1 : 0;
    }

    return { queued, unchanged, existingPending };
  });
}

function safeFetchCode(error: unknown): string {
  if (error instanceof SourceUpdateError) return error.code;

  if (error instanceof DOMException && error.name === "TimeoutError") {
    return "FETCH_TIMEOUT";
  }

  if (error instanceof SyntaxError) {
    return "PARSE_FAILED";
  }

  return "SOURCE_UPDATE_FAILED";
}

async function fetchSourcePayload(
  baseUrl: string | null,
  config: SourceAdapterConfig
): Promise<string> {
  if (!baseUrl) {
    throw new SourceUpdateError("SOURCE_BASE_URL_REQUIRED");
  }

  const base = new URL(baseUrl);
  const update = new URL(config.updateUrl);

  if (
    base.origin !== update.origin ||
    update.username ||
    update.password
  ) {
    throw new SourceUpdateError("ADAPTER_ORIGIN_MISMATCH");
  }

  const response = await fetch(update, {
    method: "GET",
    redirect: "error",
    cache: "no-store",
    headers: {
      accept:
        config.format === "json"
          ? "application/json,text/plain;q=0.9"
          : "text/csv,text/plain;q=0.9"
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });

  if (!response.ok) {
    throw new SourceUpdateError("HTTP_" + response.status);
  }

  const declaredLength = Number(
    response.headers.get("content-length") ?? "0"
  );

  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_SOURCE_BYTES
  ) {
    throw new SourceUpdateError("PAYLOAD_TOO_LARGE");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  if (bytes.byteLength > MAX_SOURCE_BYTES) {
    throw new SourceUpdateError("PAYLOAD_TOO_LARGE");
  }

  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function refreshLawSource(
  prisma: PrismaClient,
  sourceId: string
) {
  const source = await prisma.source.findFirst({
    where: {
      id: sourceId,
      official: true,
      enabled: true
    }
  });

  if (!source) {
    throw new SourceUpdateError("SOURCE_NOT_AVAILABLE");
  }

  const config = readSourceAdapterConfig(source.config);

  if (!config) {
    throw new SourceUpdateError("ADAPTER_CONFIG_MISSING");
  }

  const run = await prisma.ingestionRun.create({
    data: {
      sourceId,
      status: "RUNNING",
      startedAt: new Date()
    }
  });

  try {
    const payload = await fetchSourcePayload(source.baseUrl, config);
    const documents =
      config.format === "json"
        ? await new JsonLawAdapter().parse(payload)
        : await new CsvLawAdapter().parse(payload);

    let queued = 0;
    let unchanged = 0;
    let existingPending = 0;

    for (const document of documents) {
      const staged = await stageLawDocumentUpdate(
        prisma,
        sourceId,
        run.id,
        document
      );

      queued += staged.queued;
      unchanged += staged.unchanged;
      existingPending += staged.existingPending;
    }

    const status = queued > 0 ? "NEEDS_REVIEW" : "SUCCEEDED";

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAt: status === "SUCCEEDED" ? new Date() : null,
        summary: jsonValue({
          documents: documents.length,
          queued,
          unchanged,
          existingPending
        })
      }
    });

    return {
      runId: run.id,
      documents: documents.length,
      queued,
      unchanged,
      existingPending,
      status
    };
  } catch (error) {
    const code = safeFetchCode(error);

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        summary: jsonValue({ errorCode: code })
      }
    });

    throw new SourceUpdateError(code);
  }
}
