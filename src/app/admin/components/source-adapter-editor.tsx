"use client";

import { useState } from "react";

export function SourceAdapterEditor({
  sourceId,
  sourceName,
  initialFormat,
  initialUpdateUrl,
  canRefresh
}: {
  sourceId: string;
  sourceName: string;
  initialFormat: "json" | "csv" | null;
  initialUpdateUrl: string;
  canRefresh: boolean;
}) {
  const [format, setFormat] = useState<"json" | "csv">(
    initialFormat ?? "json"
  );
  const [updateUrl, setUpdateUrl] = useState(initialUpdateUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/sources/" + sourceId, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          adapterFormat: updateUrl.trim() ? format : null,
          updateUrl: updateUrl.trim() || null
        })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "ذخیره adapter ناموفق بود.");
      }

      setMessage("تنظیم adapter ذخیره شد.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "خطای ناشناخته"
      );
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/admin/sources/" + sourceId + "/refresh",
        { method: "POST" }
      );

      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          (body.error ?? "به‌روزرسانی ناموفق بود.") +
            (body.code ? " (" + body.code + ")" : "")
        );
      }

      setMessage(
        "بررسی " +
          sourceName +
          " تمام شد: " +
          body.queued +
          " تغییر در صف بازبینی، " +
          body.unchanged +
          " ماده بدون تغییر."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "خطای ناشناخته"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="source-adapter-editor">
      <strong>Adapter به‌روزرسانی</strong>

      <div className="form-grid">
        <label>
          فرمت
          <select
            value={format}
            onChange={(event) =>
              setFormat(event.target.value as "json" | "csv")
            }
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
        </label>

        <label>
          نشانی feed رسمی
          <input
            value={updateUrl}
            onChange={(event) => setUpdateUrl(event.target.value)}
            placeholder="https://same-origin-as-base-url/..."
          />
        </label>
      </div>

      <p className="disclaimer">
        feed باید روی همان origin نشانی پایه منبع باشد و Redirect پذیرفته
        نمی‌شود.
      </p>

      <div className="actions">
        <button type="button" disabled={busy} onClick={() => void save()}>
          ذخیره adapter
        </button>
        <button
          type="button"
          disabled={busy || !canRefresh || !updateUrl.trim()}
          onClick={() => void refresh()}
        >
          بررسی به‌روزرسانی
        </button>
      </div>

      {message && <small>{message}</small>}
    </div>
  );
}
