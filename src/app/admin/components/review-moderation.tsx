"use client";

import { useState } from "react";

export function ReviewModeration({
  reviewId,
  initialHidden,
  initialReason
}: {
  reviewId: string;
  initialHidden: boolean;
  initialReason: string;
}) {
  const [hidden, setHidden] = useState(initialHidden);
  const [reason, setReason] = useState(initialReason);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(nextHidden: boolean) {
    if (nextHidden && reason.trim().length < 5) {
      setMessage("برای پنهان‌کردن، دلیل حداقل ۵ کاراکتری لازم است.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/admin/reviews/" + reviewId,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            hidden: nextHidden,
            ...(nextHidden ? { reason: reason.trim() } : {})
          })
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "تغییر وضعیت انجام نشد.");
      }

      setHidden(body.hidden);
      setMessage(
        body.hidden ? "نظر پنهان شد." : "نظر دوباره نمایش داده می‌شود."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "خطای ناشناخته"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <label>
        دلیل پنهان‌سازی
        <input
          value={reason}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          placeholder="دلیل مشخص و قابل Audit"
        />
      </label>

      <div className="actions">
        {hidden ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void save(false)}
          >
            نمایش دوباره
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={() => void save(true)}
          >
            پنهان‌کردن نظر
          </button>
        )}
      </div>

      {message && <small>{message}</small>}
    </div>
  );
}
