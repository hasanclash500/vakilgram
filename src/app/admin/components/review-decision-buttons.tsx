"use client";

import { useState } from "react";

export function ReviewDecisionButtons({
  reviewId
}: {
  reviewId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/admin/review-queue/" + reviewId,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decision })
        }
      );

      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          (body.error ?? "اعمال تصمیم ناموفق بود.") +
            (body.code ? " (" + body.code + ")" : "")
        );
      }

      setMessage(
        decision === "approve"
          ? "تغییر تأیید و اعمال شد."
          : "تغییر رد شد."
      );

      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "خطای ناشناخته"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="actions">
      <button
        type="button"
        disabled={busy}
        onClick={() => void decide("approve")}
      >
        تأیید و اعمال
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void decide("reject")}
      >
        رد تغییر
      </button>
      {message && <small>{message}</small>}
    </div>
  );
}
