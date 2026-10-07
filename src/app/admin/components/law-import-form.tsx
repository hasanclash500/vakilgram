"use client";

import { useMemo, useState } from "react";

type SourceOption = {
  id: string;
  name: string;
};

type ImportMode = "manual" | "json" | "csv";
type LawStatus = "ACTIVE" | "AMENDED" | "REPEALED" | "UNKNOWN";

type ManualArticle = {
  number: string;
  title: string;
  text: string;
  sourceUrl: string;
};

const EMPTY_ARTICLE: ManualArticle = {
  number: "",
  title: "",
  text: "",
  sourceUrl: ""
};

export function LawImportForm({
  sources
}: {
  sources: SourceOption[];
}) {
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [mode, setMode] = useState<ImportMode>("manual");
  const [payload, setPayload] = useState("");
  const [lawTitle, setLawTitle] = useState("");
  const [lawSlug, setLawSlug] = useState("");
  const [lawSourceUrl, setLawSourceUrl] = useState("");
  const [lawStatus, setLawStatus] = useState<LawStatus>("UNKNOWN");
  const [articles, setArticles] = useState<ManualArticle[]>([
    { ...EMPTY_ARTICLE }
  ]);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const preview = useMemo(() => {
    if (mode === "manual") {
      const completeArticles = articles.filter(
        (article) =>
          article.number.trim().length > 0 &&
          article.text.trim().length > 0
      );

      return {
        valid:
          lawTitle.trim().length > 0 &&
          lawSlug.trim().length > 0 &&
          completeArticles.length === articles.length,
        lawCount: lawTitle.trim() ? 1 : 0,
        articleCount: completeArticles.length,
        titles: lawTitle.trim() ? [lawTitle.trim()] : []
      };
    }

    if (!payload.trim()) return null;

    if (mode === "csv") {
      const lines = payload
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0);

      return {
        valid:
          lines.length >= 2 &&
          lines[0]?.includes("law_title") &&
          lines[0]?.includes("law_slug") &&
          lines[0]?.includes("article_number") &&
          lines[0]?.includes("article_text"),
        lawCount: 0,
        articleCount: Math.max(0, lines.length - 1),
        titles: ["CSV"]
      };
    }

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
  }, [articles, lawSlug, lawTitle, mode, payload]);

  function updateArticle(
    index: number,
    field: keyof ManualArticle,
    value: string
  ) {
    setArticles((current) =>
      current.map((article, articleIndex) =>
        articleIndex === index ? { ...article, [field]: value } : article
      )
    );
  }

  function addArticle() {
    setArticles((current) => [...current, { ...EMPTY_ARTICLE }]);
  }

  function removeArticle(index: number) {
    setArticles((current) =>
      current.length === 1
        ? current
        : current.filter((_, articleIndex) => articleIndex !== index)
    );
  }

  function buildPayload(): unknown {
    if (mode !== "manual") {
      return mode === "json" ? JSON.parse(payload) : payload;
    }

    return {
      title: lawTitle.trim(),
      slug: lawSlug.trim(),
      sourceUrl: lawSourceUrl.trim() || null,
      status: lawStatus,
      articles: articles.map((article) => ({
        number: article.number.trim(),
        title: article.title.trim() || null,
        text: article.text.trim(),
        sourceUrl: article.sourceUrl.trim() || null
      }))
    };
  }

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
          format: mode === "csv" ? "csv" : "json",
          payload: buildPayload()
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
      <h2>ورود قانون</h2>
      <p className="disclaimer">
        فقط داده منبع رسمی ثبت می‌شود؛ متن ماده از مدل هوش مصنوعی تولید
        نمی‌شود.
      </p>

      <div className="mode-row">
        {(["manual", "json", "csv"] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={mode === item ? "active" : ""}
            onClick={() => setMode(item)}
          >
            {item === "manual"
              ? "ورود دستی"
              : item === "json"
                ? "JSON"
                : "CSV"}
          </button>
        ))}
      </div>

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

      {mode === "manual" ? (
        <>
          <div className="form-grid">
            <label>
              عنوان قانون
              <input
                value={lawTitle}
                onChange={(event) => setLawTitle(event.target.value)}
              />
            </label>
            <label>
              Slug
              <input
                value={lawSlug}
                onChange={(event) => setLawSlug(event.target.value)}
                placeholder="civil-procedure"
              />
            </label>
            <label>
              وضعیت
              <select
                value={lawStatus}
                onChange={(event) =>
                  setLawStatus(event.target.value as LawStatus)
                }
              >
                <option value="UNKNOWN">نامشخص</option>
                <option value="ACTIVE">جاری</option>
                <option value="AMENDED">اصلاح‌شده</option>
                <option value="REPEALED">منسوخ</option>
              </select>
            </label>
          </div>

          <label>
            نشانی منبع قانون
            <input
              value={lawSourceUrl}
              onChange={(event) => setLawSourceUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>

          {articles.map((article, index) => (
            <div className="article-editor" key={index}>
              <div className="form-grid">
                <label>
                  شماره ماده
                  <input
                    value={article.number}
                    onChange={(event) =>
                      updateArticle(index, "number", event.target.value)
                    }
                  />
                </label>
                <label>
                  عنوان ماده (اختیاری)
                  <input
                    value={article.title}
                    onChange={(event) =>
                      updateArticle(index, "title", event.target.value)
                    }
                  />
                </label>
              </div>

              <label>
                متن رسمی ماده
                <textarea
                  rows={6}
                  value={article.text}
                  onChange={(event) =>
                    updateArticle(index, "text", event.target.value)
                  }
                />
              </label>

              <label>
                نشانی منبع ماده (اختیاری)
                <input
                  value={article.sourceUrl}
                  onChange={(event) =>
                    updateArticle(index, "sourceUrl", event.target.value)
                  }
                  placeholder="https://..."
                />
              </label>

              <button
                type="button"
                onClick={() => removeArticle(index)}
                disabled={articles.length === 1}
              >
                حذف ماده
              </button>
            </div>
          ))}

          <button type="button" onClick={addArticle}>
            افزودن ماده دیگر
          </button>
        </>
      ) : (
        <>
          <label htmlFor="lawPayload">
            {mode === "json" ? "JSON قانون" : "CSV قانون"}
          </label>
          <textarea
            id="lawPayload"
            rows={16}
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
            placeholder={
              mode === "json"
                ? '{"title":"...","slug":"...","status":"ACTIVE","articles":[{"number":"1","text":"..."}]}'
                : "law_title,law_slug,law_status,article_number,article_text\n..."
            }
          />
        </>
      )}

      {preview && (
        <div className="preview-box">
          {preview.valid ? (
            <>
              <strong>پیش‌نمایش معتبر</strong>
              <p>
                {preview.lawCount || "—"} قانون · {preview.articleCount} ماده
              </p>
              <small>{preview.titles.join(" · ")}</small>
            </>
          ) : (
            <strong className="error">داده برای ثبت کامل نیست.</strong>
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
