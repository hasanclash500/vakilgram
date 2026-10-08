"use client";

import { useEffect, useState } from "react";

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

export function ChatThread({
  conversationId,
  initialMessages,
  currentRole,
  initialStatus
}: {
  conversationId: string;
  initialMessages: ChatMessage[];
  currentRole: "USER" | "LAWYER";
  initialStatus: "OPEN" | "CLOSED";
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [status, setStatus] = useState(initialStatus);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshMessages() {
    const response = await fetch(
      "/api/chat/conversations/" +
        conversationId +
        "/messages",
      { cache: "no-store" }
    );

    if (!response.ok) return;

    const body = await response.json();
    setMessages(body.messages ?? []);
  }

  useEffect(() => {
    if (status !== "OPEN") return;

    const timer = window.setInterval(() => {
      void refreshMessages();
    }, 8000);

    return () => window.clearInterval(timer);
  }, [conversationId, status]);

  async function send() {
    const clean = content.trim();
    if (!clean || sending || status !== "OPEN") return;

    setSending(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/chat/conversations/" +
          conversationId +
          "/messages",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content: clean })
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "ارسال پیام انجام نشد.");
      }

      setMessages((current) => [...current, body.message]);
      setContent("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "خطای ناشناخته"
      );
    } finally {
      setSending(false);
    }
  }

  async function close() {
    const response = await fetch(
      "/api/chat/conversations/" +
        conversationId +
        "/close",
      { method: "POST" }
    );

    if (response.ok) {
      setStatus("CLOSED");
    }
  }

  return (
    <section className="assistant-card">
      <div className="chat-messages" aria-live="polite">
        {messages.map((message) => (
          <article
            className={
              "chat-message " +
              (message.role === currentRole ? "chat-own" : "")
            }
            key={message.id}
          >
            <strong>
              {message.role === "LAWYER" ? "وکیل" : "کاربر"}
            </strong>
            <p>{message.content}</p>
            <small>
              {new Date(message.createdAt).toLocaleString("fa-IR")}
            </small>
          </article>
        ))}

        {messages.length === 0 && (
          <p className="disclaimer">
            هنوز پیامی ارسال نشده است.
          </p>
        )}
      </div>

      {status === "OPEN" ? (
        <>
          <label htmlFor="chatMessage">پیام</label>
          <textarea
            id="chatMessage"
            rows={4}
            maxLength={4000}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />

          <div className="actions">
            <button
              type="button"
              disabled={sending || !content.trim()}
              onClick={() => void send()}
            >
              {sending ? "در حال ارسال..." : "ارسال پیام"}
            </button>
            <button type="button" onClick={() => void refreshMessages()}>
              تازه‌سازی
            </button>
            <button type="button" onClick={() => void close()}>
              بستن گفتگو
            </button>
          </div>
        </>
      ) : (
        <p className="disclaimer">
          این گفتگو بسته شده است و پیام جدید نمی‌پذیرد.
        </p>
      )}

      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
