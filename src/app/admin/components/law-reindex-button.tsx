"use client";

import { useState } from "react";

type ReindexResponse = {
  ok: boolean;
  batchCount: number;
  textIndexed: number;
  embeddingIndexed: number;
  nextCursor: string | null;
  error?: string;
};

const BATCH_SIZE = 10;
const MAX_BATCHES = 1000;

export function LawReindexButton() {
  const [running, setRunning] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [embedded, setEmbedded] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  async function run() {
    if (running) return;

    setRunning(true);
    setProcessed(0);
    setEmbedded(0);
    setStatus("بازسازی ایندکس شروع شد...");

    let cursor: string | undefined;
    let totalProcessed = 0;
    let totalEmbedded = 0;

    try {
      for (let batchNumber = 0; batchNumber < MAX_BATCHES; batchNumber += 1) {
        const response = await fetch("/api/admin/laws/reindex", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            cursor,
            batchSize: BATCH_SIZE
          })
        });

        const body = (await response.json()) as ReindexResponse;

        if (!response.ok) {
          throw new Error(body.error ?? "بازسازی ایندکس ناموفق بود.");
        }

        totalProcessed += body.textIndexed;
        totalEmbedded += body.embeddingIndexed;
        setProcessed(totalProcessed);
        setEmbedded(totalEmbedded);

        if (!body.nextCursor) {
          setStatus(
            "بازسازی کامل شد: " +
              totalProcessed +
              " ماده متنی، " +
              totalEmbedded +
              " embedding."
          );
          return;
        }

        cursor = body.nextCursor;
      }

      setStatus(
        "به سقف حفاظتی batch رسیدیم؛ برای ادامه دوباره دکمه را اجرا کنید."
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "خطای ناشناخته"
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="assistant-card">
      <h2>بازسازی ایندکس قوانین</h2>
      <p className="disclaimer">
        برای مواد Sourceهای رسمی و فعال، full-text index همیشه بازسازی
        می‌شود. اگر Embedding Provider فعال و سالم باشد، vectorها هم
        دوباره تولید می‌شوند.
      </p>

      <div className="actions">
        <button
          type="button"
          disabled={running}
          onClick={() => void run()}
        >
          {running ? "در حال بازسازی..." : "بازسازی همه ایندکس‌ها"}
        </button>
        <small>
          پردازش‌شده: {processed} · embedding: {embedded}
        </small>
      </div>

      {status && <p>{status}</p>}
    </section>
  );
}
