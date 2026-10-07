"use client";

import { useMemo, useState } from "react";

type SourceOption = {
  id: string;
  name: string;
};

export function LawImportForm({
  sources
}: {
  sources: SourceOption[];
}) {
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [payload, setPayload] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const preview = useMemo(() => {
    if (!payload.trim()) return null;

    try {
      const parsed = JSON.parse(payload);
      const laws = Array.isArray(parsed) ? parsed : [parsed];

      return {
        valid: true,
        lawCount: laws.length,
        articleCount: laws.reduce(
          (sum: number, law: { articles?: unknown[] }) =>
            sum + (Array.isArray(law?.articles) ? law.articles.length : 0),
          0
        ),
        titles: laws
          .map((law: { title?: unknown }) =>
            typeof law?.title === "string" ? law.title : "بدون عنوان"
          )
          .slice(0, 5)
      };
    } catch {
      return { valid: false, lawCount: 0, articleCount: 0, titles: [] };
    }
  }, [payload]);

  async function submit() {
    if (!sourceId || !preview?.valid || submitting) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/laws/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceId,
          payload: JSON.parse(payload)
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "ورود داده ناموفق بود.");
      }

      setMessage("ورود داده با موفقیت انجام شد.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "خطای ناشناخته"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="assistant-card">
      <h2>ورود قانون از JSON</h2>
      <p className="disclaimer">
        فقط داده‌ای را وارد کنید که از منبع رسمی تهیه شده است. سیستم هیچ
        متن قانونی را خودش تولید نمی‌کند.
      </p>

      <label htmlFor="sourceId">منبع رسمی</label>
      <select
        id="sourceId"
        value={sourceId}
        onChange={(event) => setSourceId(event.target.value)}
      >
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.name}
          </option>
        ))}
      </select>

      <label htmlFor="lawJson">JSON قانون</label>
      <textarea
        id="lawJson"
        rows={14}
        value={payload}
        onChange={(event) => setPayload(event.target.value)}
        placeholder={'{"title":"...","slug":"...","articles":[{"number":"1","text":"..."}]}'}
      />

      {preview && (
        <div className="preview-box">
          {preview.valid ? (
            <>
              <strong>پیش‌نمایش معتبر</strong>
              <p>
                {preview.lawCount} قانون · {preview.articleCount} ماده
              </p>
              <small>{preview.titles.join(" · ")}</small>
            </>
          ) : (
            <strong className="error">JSON قابل خواندن نیست.</strong>
          )}
        </div>
      )}

      <div className="actions">
        <button
          type="button"
          disabled={!preview?.valid || !sourceId || submitting}
          onClick={() => void submit()}
        >
          {submitting ? "در حال ورود..." : "تأیید و ورود"}
        </button>
      </div>

      {message && <p>{message}</p>}
    </section>
  );
}
