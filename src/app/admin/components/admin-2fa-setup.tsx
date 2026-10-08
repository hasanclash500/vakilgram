"use client";

import { useState } from "react";

type SetupPayload = {
  secret: string;
  otpAuthUri: string;
  recoveryCodes: string[];
};

export function AdminTwoFactorSetup({
  initialEnabled
}: {
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function begin() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/2fa/setup", {
        method: "POST"
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "شروع راه‌اندازی انجام نشد.");
      }

      setSetup(body);
      setMessage(
        "Secret را در برنامه Authenticator وارد کنید و recovery codeها را در محل امن نگه دارید."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "خطای ناشناخته"
      );
    } finally {
      setLoading(false);
    }
  }

  async function enable() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/2fa/enable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code })
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "فعال‌سازی انجام نشد.");
      }

      setEnabled(true);
      setSetup(null);
      setCode("");
      setMessage("تأیید دومرحله‌ای فعال شد.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "خطای ناشناخته"
      );
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/2fa/disable", {
        method: "POST"
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "غیرفعال‌سازی انجام نشد.");
      }

      setEnabled(false);
      setSetup(null);
      setMessage("تأیید دومرحله‌ای غیرفعال شد.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "خطای ناشناخته"
      );
    } finally {
      setLoading(false);
    }
  }

  if (enabled) {
    return (
      <section className="assistant-card">
        <h2>2FA فعال است</h2>
        <p>
          ورود به پنل و همه APIهای ادمین به عامل دوم معتبر نیاز دارد.
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={() => void disable()}
        >
          غیرفعال‌کردن 2FA
        </button>
        {message && <p>{message}</p>}
      </section>
    );
  }

  return (
    <section className="assistant-card">
      <h2>فعال‌سازی TOTP</h2>
      <p>
        از Google Authenticator، Microsoft Authenticator، 1Password یا هر
        برنامه سازگار با TOTP استفاده کنید.
      </p>

      {!setup ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void begin()}
        >
          ساخت Secret و Recovery Code
        </button>
      ) : (
        <>
          <h3>کلید دستی</h3>
          <code className="secret-code">{setup.secret}</code>

          <details>
            <summary>OTP Auth URI</summary>
            <code className="secret-code">{setup.otpAuthUri}</code>
          </details>

          <h3>Recovery Codeها</h3>
          <p className="law-warning">
            این کدها فقط همین حالا نمایش داده می‌شوند. آن‌ها را در محل امن
            و خارج از وکیل‌گرام ذخیره کنید.
          </p>
          <ul className="recovery-codes">
            {setup.recoveryCodes.map((item) => (
              <li key={item}><code>{item}</code></li>
            ))}
          </ul>

          <label>
            کد ۶ رقمی برنامه Authenticator
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="123456"
            />
          </label>

          <div className="actions">
            <button
              type="button"
              disabled={loading || !/^\d{6}$/.test(code)}
              onClick={() => void enable()}
            >
              تأیید و فعال‌سازی
            </button>
          </div>
        </>
      )}

      {message && <p>{message}</p>}
    </section>
  );
}
