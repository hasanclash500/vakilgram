"use client";

import { useState } from "react";

export function AdminTwoFactorChallenge({
  callbackUrl
}: {
  callbackUrl: string;
}) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setChecking(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/2fa/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code })
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "کد معتبر نیست.");
      }

      window.location.href = callbackUrl;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "خطای ناشناخته"
      );
      setChecking(false);
    }
  }

  return (
    <section className="assistant-card">
      <label>
        کد Authenticator یا Recovery Code
        <input
          autoFocus
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          maxLength={32}
        />
      </label>

      <div className="actions">
        <button
          type="button"
          disabled={checking || code.trim().length < 6}
          onClick={() => void verify()}
        >
          {checking ? "در حال بررسی..." : "تأیید"}
        </button>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
