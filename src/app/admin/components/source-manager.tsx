"use client";

import { useState } from "react";

type SourceRow = {
  id: string;
  name: string;
  baseUrl: string | null;
  sourceType: string;
  official: boolean;
  enabled: boolean;
};

export function SourceManager({
  initialSources
}: {
  initialSources: SourceRow[];
}) {
  const [sources, setSources] = useState(initialSources);
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [sourceType, setSourceType] = useState("official-web");
  const [message, setMessage] = useState<string | null>(null);

  async function createSource() {
    setMessage(null);

    const response = await fetch("/api/admin/sources", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        baseUrl: baseUrl.trim() || null,
        sourceType,
        official: true,
        enabled: true
      })
    });

    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error ?? "خطا در ایجاد منبع");
      return;
    }

    setSources((current) => [...current, body.source]);
    setName("");
    setBaseUrl("");
    setMessage("منبع رسمی اضافه شد.");
  }

  async function toggle(source: SourceRow, field: "enabled" | "official") {
    const next = !source[field];

    const response = await fetch("/api/admin/sources/" + source.id, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ [field]: next })
    });

    if (!response.ok) return;

    setSources((current) =>
      current.map((item) =>
        item.id === source.id ? { ...item, [field]: next } : item
      )
    );
  }

  return (
    <section className="assistant-card">
      <h2>منابع قوانین</h2>
      <p className="disclaimer">
        فقط منابعی که «رسمی» و «فعال» هستند برای ورود قانون قابل انتخاب‌اند.
      </p>

      <div className="form-grid">
        <label>
          نام منبع
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="مثلاً روزنامه رسمی"
          />
        </label>
        <label>
          نوع
          <input
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value)}
          />
        </label>
      </div>

      <label>
        نشانی پایه
        <input
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
          placeholder="https://..."
        />
      </label>

      <div className="actions">
        <button
          type="button"
          disabled={name.trim().length < 2 || sourceType.trim().length < 2}
          onClick={() => void createSource()}
        >
          افزودن منبع رسمی
        </button>
        {message && <small>{message}</small>}
      </div>

      <div className="source-list">
        {sources.map((source) => (
          <article className="source-row" key={source.id}>
            <div>
              <strong>{source.name}</strong>
              <small>{source.sourceType}</small>
              {source.baseUrl && (
                <a href={source.baseUrl} target="_blank" rel="noreferrer">
                  {source.baseUrl}
                </a>
              )}
            </div>
            <div className="status-controls">
              <label>
                <input
                  type="checkbox"
                  checked={source.official}
                  onChange={() => void toggle(source, "official")}
                />
                رسمی
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={source.enabled}
                  onChange={() => void toggle(source, "enabled")}
                />
                فعال
              </label>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
