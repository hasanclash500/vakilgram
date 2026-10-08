"use client";

import { useState } from "react";

export function LawyerOwnerEditor({
  lawyerId,
  initialOwnerEmail
}: {
  lawyerId: string;
  initialOwnerEmail: string;
}) {
  const [email, setEmail] = useState(initialOwnerEmail);
  const [savedEmail, setSavedEmail] = useState(initialOwnerEmail);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(nextEmail: string | null) {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/admin/lawyers/" + lawyerId + "/owner",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: nextEmail
          })
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "اتصال حساب انجام نشد.");
      }

      const ownerEmail =
        typeof body.ownerEmail === "string" ? body.ownerEmail : "";

      setEmail(ownerEmail);
      setSavedEmail(ownerEmail);
      setMessage(
        ownerEmail
          ? "حساب کاربری به پروفایل وکیل متصل شد."
          : "اتصال حساب برداشته شد."
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
    <section className="assistant-card">
      <h3>حساب مالک پروفایل</h3>
      <p className="disclaimer">
        فقط ایمیل حسابی را وارد کنید که قبلاً وارد وکیل‌گرام شده است. این
        اتصال به کاربر اجازه می‌دهد پروفایل خودش را از پنل وکیل مدیریت کند.
      </p>

      <label>
        ایمیل حساب
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="lawyer@example.com"
        />
      </label>

      <div className="actions">
        <button
          type="button"
          disabled={
            busy ||
            !email.trim() ||
            email.trim().toLowerCase() ===
              savedEmail.trim().toLowerCase()
          }
          onClick={() => void save(email.trim().toLowerCase())}
        >
          اتصال حساب
        </button>

        {savedEmail && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(null)}
          >
            حذف اتصال
          </button>
        )}

        {message && <small>{message}</small>}
      </div>
    </section>
  );
}
