"use client";

import { useState } from "react";

const MAX_BYTES = 2 * 1024 * 1024;

export function LawyerCsvImport() {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function readFile(file: File) {
    setStatus(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setStatus("فقط فایل CSV قابل انتخاب است.");
      return;
    }

    if (file.size > MAX_BYTES) {
      setStatus("حجم فایل بیشتر از ۲ مگابایت است.");
      return;
    }

    try {
      setCsv(await file.text());
      setFileName(file.name);
      setStatus(
        "فایل خوانده شد. هیچ ردیفی با این import خودکار تأیید نمی‌شود."
      );
    } catch {
      setStatus("خواندن فایل انجام نشد.");
    }
  }

  async function submit() {
    if (!csv.trim() || busy) return;

    setBusy(true);
    setStatus(null);

    try {
      const response = await fetch("/api/admin/lawyers/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "ورود گروهی ناموفق بود.");
      }

      setStatus(
        body.created +
          " پروفایل ساخته شد. همه پروفایل‌ها تا تأیید دستی پروانه، تأییدنشده هستند."
      );
      setCsv("");
      setFileName(null);
      window.location.reload();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "خطای ناشناخته"
      );
    } finally {
      setBusy(false);
    }
  }

  const dataRows = Math.max(
    0,
    csv.split(/\r?\n/).filter((line) => line.trim()).length - 1
  );

  return (
    <section className="assistant-card">
      <h2>ورود گروهی وکلا با CSV</h2>
      <p className="disclaimer">
        ستون‌های اجباری: full_name، slug، city. ستون‌های اختیاری:
        license_number، province، bio، avatar_url، active، specialties و
        social_links. تخصص‌ها با | و لینک‌ها با ; جدا می‌شوند؛ هر لینک
        به‌صورت platform|https://... است.
      </p>

      <label>
        فایل CSV
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readFile(file);
            event.target.value = "";
          }}
        />
      </label>

      {fileName && (
        <p>
          {fileName} · {dataRows} ردیف داده
        </p>
      )}

      <details>
        <summary>مشاهده/ویرایش متن CSV</summary>
        <textarea
          rows={10}
          value={csv}
          onChange={(event) => setCsv(event.target.value)}
          placeholder="full_name,slug,city,..."
        />
      </details>

      <div className="actions">
        <button
          type="button"
          disabled={busy || !csv.trim()}
          onClick={() => void submit()}
        >
          {busy ? "در حال ورود..." : "ورود گروهی بدون تأیید خودکار"}
        </button>
        {status && <small>{status}</small>}
      </div>
    </section>
  );
}
