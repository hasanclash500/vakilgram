"use client";

import { useState } from "react";

type LawStatus = "ACTIVE" | "AMENDED" | "REPEALED" | "UNKNOWN";

export function LawMetadataEditor({
  law
}: {
  law: {
    id: string;
    title: string;
    sourceUrl: string | null;
    enactedAt: string | null;
    effectiveAt: string | null;
    status: LawStatus;
  };
}) {
  const [title, setTitle] = useState(law.title);
  const [sourceUrl, setSourceUrl] = useState(law.sourceUrl ?? "");
  const [enactedAt, setEnactedAt] = useState(law.enactedAt ?? "");
  const [effectiveAt, setEffectiveAt] = useState(law.effectiveAt ?? "");
  const [status, setStatus] = useState<LawStatus>(law.status);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/laws/" + law.id, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          sourceUrl: sourceUrl.trim() || null,
          enactedAt: enactedAt || null,
          effectiveAt: effectiveAt || null,
          status
        })
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "خطا در ذخیره");
      }

      setMessage("اطلاعات قانون ذخیره شد.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "خطای ناشناخته"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="assistant-card">
      <h2>اطلاعات قانون</h2>

      <label>
        عنوان
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label>
        صفحه منبع رسمی
        <input
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          placeholder="https://..."
        />
      </label>

      <div className="form-grid">
        <label>
          تاریخ تصویب
          <input
            type="date"
            value={enactedAt}
            onChange={(event) => setEnactedAt(event.target.value)}
          />
        </label>

        <label>
          تاریخ اجرا
          <input
            type="date"
            value={effectiveAt}
            onChange={(event) => setEffectiveAt(event.target.value)}
          />
        </label>

        <label>
          وضعیت
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as LawStatus)
            }
          >
            <option value="UNKNOWN">نامشخص</option>
            <option value="ACTIVE">جاری</option>
            <option value="AMENDED">اصلاح‌شده</option>
            <option value="REPEALED">منسوخ</option>
          </select>
        </label>
      </div>

      <div className="actions">
        <button
          type="button"
          disabled={saving || title.trim().length < 2}
          onClick={() => void save()}
        >
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </button>
        {message && <small>{message}</small>}
      </div>
    </section>
  );
}
