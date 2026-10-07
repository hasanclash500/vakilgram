"use client";

import { useEffect, useState } from "react";
import {
  browserSpeechToText,
  browserTextToSpeech
} from "@/modules/voice/browser-voice";
import type { LegalAnswer } from "@/modules/legal-qa/types";
import type { LawyerRecommendation } from "@/modules/lawyers/types";
import { LAW_STATUS_LABELS } from "@/modules/laws/status";

function LawyerCard({
  lawyer
}: {
  lawyer: LawyerRecommendation;
}) {
  function recordClick() {
    void fetch(`/api/lawyers/${lawyer.id}/click`, {
      method: "POST",
      keepalive: true
    });
  }

  return (
    <a
      className="lawyer-card"
      href={`/lawyers/${lawyer.slug}`}
      onClick={recordClick}
    >
      <div>
        <strong>{lawyer.fullName}</strong>
        {lawyer.verified && <span className="verified">تأییدشده</span>}
        {lawyer.sponsored && <span className="sponsored">تبلیغاتی</span>}
      </div>
      <small>
        {lawyer.city}
        {lawyer.province ? `، ${lawyer.province}` : ""}
      </small>
      {lawyer.specialties.length > 0 && (
        <p>{lawyer.specialties.join(" · ")}</p>
      )}
    </a>
  );
}

export function LegalAssistant() {
  const [question, setQuestion] = useState("");
  const [city, setCity] = useState("");
  const [mode, setMode] = useState<"simple" | "expert">("simple");
  const [answer, setAnswer] = useState<LegalAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(
    process.env.NEXT_PUBLIC_FEATURE_VOICE !== "false"
  );
  const [sttSupported, setSttSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/public/settings", { cache: "no-store" })
      .then((response) => response.json())
      .then((settings: { voiceEnabled?: boolean }) => {
        if (typeof settings.voiceEnabled === "boolean") {
          setVoiceEnabled(settings.voiceEnabled);
        }
      })
      .catch(() => {
        // Environment default remains active when settings API is unavailable.
      });
  }, []);

  useEffect(() => {
    if (!voiceEnabled) {
      setSttSupported(false);
      setTtsSupported(false);
      browserTextToSpeech.stop();
      return;
    }

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
        body: JSON.stringify({
          question: clean,
          mode,
          city: city.trim() || undefined
        })
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

      <label htmlFor="city">شهر شما (اختیاری)</label>
      <input
        id="city"
        value={city}
        onChange={(event) => setCity(event.target.value)}
        placeholder="مثلاً تهران"
        maxLength={100}
      />

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
                      <span
                        className={
                          "law-status law-status-" +
                          source.lawStatus.toLowerCase()
                        }
                      >
                        {LAW_STATUS_LABELS[source.lawStatus] ??
                          source.lawStatus}
                      </span>
                    </summary>
                    {source.lawStatus === "REPEALED" && (
                      <p className="law-warning">
                        این منبع در پایگاه به‌عنوان منسوخ ثبت شده است؛
                        برای وضعیت جاری، منابع جدیدتر را نیز بررسی کنید.
                      </p>
                    )}
                    <p>{source.text}</p>
                    <div className="source-links">
                      <a
                        href={
                          "/laws/" +
                          source.lawSlug +
                          "#article-" +
                          source.articleId
                        }
                      >
                        مشاهده ماده در وکیل‌گرام
                      </a>
                      {source.sourceUrl && (
                        <a
                          href={source.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          منبع رسمی
                        </a>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </>
          )}

          {answer.lawyers.featured.length > 0 && (
            <>
              <h3>وکلای ویژه</h3>
              <div className="lawyer-grid">
                {answer.lawyers.featured.map((lawyer) => (
                  <LawyerCard key={lawyer.id} lawyer={lawyer} />
                ))}
              </div>
            </>
          )}

          {answer.lawyers.others.length > 0 && (
            <>
              <h3>سایر وکلای مرتبط</h3>
              <div className="lawyer-grid">
                {answer.lawyers.others.map((lawyer) => (
                  <LawyerCard key={lawyer.id} lawyer={lawyer} />
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
