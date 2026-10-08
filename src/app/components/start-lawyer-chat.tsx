"use client";

import { useState } from "react";

export function StartLawyerChat({
  lawyerId,
  lawyerName
}: {
  lawyerId: string;
  lawyerName: string;
}) {
  const [consent, setConsent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function startChat() {
    if (!consent || starting) return;

    setStarting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lawyerId,
          consentToStore: true
        })
      });

      if (response.status === 401) {
        window.location.href =
          "/api/auth/signin?callbackUrl=" +
          encodeURIComponent(window.location.pathname);
        return;
      }

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "شروع چت انجام نشد.");
      }

      window.location.href = "/chat/" + body.conversationId;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "خطای ناشناخته"
      );
      setStarting(false);
    }
  }

  return (
    <div className="chat-start">
      <p>
        برای گفت‌وگوی مستقیم با {lawyerName}، پیام‌های این Conversation
        باید ذخیره شوند. این ذخیره‌سازی فقط بعد از رضایت صریح شما فعال
        می‌شود و مستقل از دستیار حقوقی است.
      </p>

      <label className="check-row">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        با ذخیره پیام‌های این گفت‌وگو برای ارائه قابلیت چت موافقم.
      </label>

      <div className="actions">
        <button
          type="button"
          disabled={!consent || starting}
          onClick={() => void startChat()}
        >
          {starting ? "در حال شروع..." : "شروع چت"}
        </button>
      </div>

      {message && <p className="error">{message}</p>}
    </div>
  );
}
