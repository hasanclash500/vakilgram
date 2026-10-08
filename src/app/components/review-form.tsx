"use client";

import { useState } from "react";

export function ReviewForm({
  lawyerId,
  conversationId
}: {
  lawyerId: string;
  conversationId: string;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    if (saving || submitted) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lawyerId,
          conversationId,
          rating,
          comment: comment.trim() || undefined
        })
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "ثبت نظر انجام نشد.");
      }

      setSubmitted(true);
      setMessage("نظر شما ثبت شد.");
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
      <h2>ثبت نظر درباره وکیل</h2>
      <p className="disclaimer">
        این فرم فقط برای گفت‌وگوی واقعی دوطرفه و بسته‌شده فعال می‌شود.
      </p>

      <label>
        امتیاز
        <select
          value={rating}
          disabled={submitted}
          onChange={(event) =>
            setRating(Number(event.target.value))
          }
        >
          <option value={5}>۵ ستاره</option>
          <option value={4}>۴ ستاره</option>
          <option value={3}>۳ ستاره</option>
          <option value={2}>۲ ستاره</option>
          <option value={1}>۱ ستاره</option>
        </select>
      </label>

      <label>
        توضیح اختیاری
        <textarea
          rows={4}
          maxLength={2000}
          disabled={submitted}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </label>

      <div className="actions">
        <button
          type="button"
          disabled={saving || submitted}
          onClick={() => void submit()}
        >
          {saving ? "در حال ثبت..." : "ثبت نظر"}
        </button>
      </div>

      {message && <p>{message}</p>}
    </section>
  );
}
