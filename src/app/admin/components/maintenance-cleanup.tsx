"use client";

import { useState } from "react";

export function MaintenanceCleanup() {
  const [rateHours, setRateHours] = useState(48);
  const [usageDays, setUsageDays] = useState(90);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function cleanup() {
    setRunning(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/maintenance/cleanup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rateLimitRetentionHours: rateHours,
          aiUsageRetentionDays: usageDays
        })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "پاکسازی ناموفق بود.");
      }

      setMessage(
        "پاکسازی انجام شد: " +
          body.deletedRateLimitRows +
          " رکورد rate-limit و " +
          body.deletedAiUsageRows +
          " رکورد telemetry حذف شد."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "خطای ناشناخته"
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="assistant-card">
      <h2>پاکسازی داده‌های موقت</h2>
      <p className="disclaimer">
        Audit log، قوانین، نسخه مواد، کاربران و اطلاعات وکلا در این عملیات
        حذف نمی‌شوند.
      </p>

      <div className="form-grid">
        <label>
          نگهداری rate-limit (ساعت)
          <input
            type="number"
            min={1}
            max={720}
            value={rateHours}
            onChange={(event) =>
              setRateHours(Number(event.target.value))
            }
          />
        </label>

        <label>
          نگهداری telemetry AI (روز)
          <input
            type="number"
            min={1}
            max={3650}
            value={usageDays}
            onChange={(event) =>
              setUsageDays(Number(event.target.value))
            }
          />
        </label>
      </div>

      <div className="actions">
        <button
          type="button"
          disabled={running}
          onClick={() => void cleanup()}
        >
          {running ? "در حال پاکسازی..." : "اجرای پاکسازی"}
        </button>
      </div>

      {message && <p>{message}</p>}
    </section>
  );
}
