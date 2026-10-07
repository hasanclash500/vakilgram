"use client";

import { useEffect, useState } from "react";
import {
  browserSpeechToText,
  browserTextToSpeech
} from "@/modules/voice/browser-voice";
import type { LegalAnswer } from "@/modules/legal-qa/types";

export function LegalAssistant() {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState<"simple" | "expert">("simple");
  const [answer, setAnswer] = useState<LegalAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const voiceEnabled =
    process.env.NEXT_PUBLIC_FEATURE_VOICE !== "false";

  useEffect(() => {
    if (!voiceEnabled) return;
    setSttSupported(browserSpeechToText.isSupported());
    setTtsSupported(browserTextToSpeech.isSupported());

    return () => {
      browserTextToSpeech.stop();
    };
  }, [voiceEnabled]);

  async function ask(text = question) {
    const clean = text.trim();
    if (clean.length < 3 || loading) return;

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const response = await fetch("/api/legal/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: clean, mode })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "خطا در دریافت پاسخ");
      }

      setAnswer(body as LegalAnswer);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "خطای ناشناخته"
      );
    } finally {
      setLoading(false);
    }
  }

  function listen() {
    setError(null);
    setListening(true);

    try {
      browserSpeechToText.start(
        (text) => {
          setQuestion(text);
          void ask(text);
        },
        () => setListening(false),
        () => {
          setListening(false);
          setError("تشخیص صوت در این مرورگر با خطا روبه‌رو شد.");
        }
      );
    } catch {
      setListening(false);
      setError("ورودی صوتی در این مرورگر پشتیبانی نمی‌شود.");
    }
  }

  return (
    <section className="assistant-card">
      <div className="mode-row">
        <button
          className={mode === "simple" ? "active" : ""}
          onClick={() => setMode("simple")}
          type="button"
        >
          ساده
        </button>
        <button
          className={mode === "expert" ? "active" : ""}
          onClick={() => setMode("expert")}
          type="button"
        >
          تخصصی
        </button>
      </div>

      <label htmlFor="question">پرسش حقوقی شما</label>
      <textarea
        id="question"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="مثلاً درباره شرایط مطالبه وجه یک چک سؤال کنید..."
        rows={6}
        maxLength={2000}
      />

      <div className="actions">
        <button
          onClick={() => void ask()}
          disabled={loading}
          type="button"
        >
          {loading ? "در حال بررسی منابع..." : "دریافت پاسخ مستند"}
        </button>

        {voiceEnabled && sttSupported && (
          <button
            onClick={listen}
            disabled={listening || loading}
            type="button"
          >
            {listening ? "در حال شنیدن..." : "پرسش صوتی"}
          </button>
        )}
      </div>

      {voiceEnabled && !sttSupported && (
        <p className="disclaimer">
          ورودی صوتی در این مرورگر در دسترس نیست؛ نسخه متنی بدون محدودیت
          قابل استفاده است.
        </p>
      )}

      {error && <p className="error">{error}</p>}

      {answer && (
        <article className="answer">
          <h2>{answer.summary}</h2>
          <p>{answer.answer}</p>

          {answer.sources.length > 0 && (
            <>
              <h3>منابع قانونی</h3>
              <div className="sources">
                {answer.sources.map((source) => (
                  <details key={source.articleId}>
                    <summary>
                      {source.lawTitle} — ماده {source.articleNumber}
                    </summary>
                    <p>{source.text}</p>
                    {source.sourceUrl && (
                      <a
                        href={source.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        منبع رسمی
                      </a>
                    )}
                  </details>
                ))}
              </div>
            </>
          )}

          <p className="disclaimer">{answer.disclaimer}</p>

          {voiceEnabled && ttsSupported && answer.documented && (
            <button
              type="button"
              onClick={() => browserTextToSpeech.speak(answer.answer)}
            >
              خواندن پاسخ
            </button>
          )}
        </article>
      )}
    </section>
  );
}
