"use client";

import { useState } from "react";

export function AiProviderCreateForm() {
  const [kind, setKind] = useState<"LLM" | "EMBEDDING">("LLM");
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKeyEnv, setApiKeyEnv] = useState("");
  const [position, setPosition] = useState(20);
  const [timeoutMs, setTimeoutMs] = useState(15000);
  const [status, setStatus] = useState<string | null>(null);

  async function create() {
    setStatus(null);

    const response = await fetch("/api/admin/ai/providers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind,
        name,
        baseUrl,
        model,
        apiKeyEnv: apiKeyEnv.trim() || null,
        position,
        timeoutMs,
        enabled: false
      })
    });

    const body = await response.json();
    if (!response.ok) {
      setStatus(body.error ?? "خطا در ساخت Provider");
      return;
    }

    setName("");
    setBaseUrl("");
    setModel("");
    setApiKeyEnv("");
    setStatus("Provider ساخته شد؛ برای فعال‌سازی صفحه را تازه کنید.");
  }

  return (
    <section className="assistant-card">
      <h2>Provider جدید</h2>
      <p className="disclaimer">
        فقط LLM و Embedding سمت سرور از این بخش ساخته می‌شوند. Voice فاز ۱
        از Provider مرورگر استفاده می‌کند.
      </p>

      <div className="form-grid">
        <label>
          نوع
          <select
            value={kind}
            onChange={(event) =>
              setKind(event.target.value as "LLM" | "EMBEDDING")
            }
          >
            <option value="LLM">LLM</option>
            <option value="EMBEDDING">Embedding</option>
          </select>
        </label>

        <label>
          نام
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label>
          مدل
          <input
            value={model}
            onChange={(event) => setModel(event.target.value)}
          />
        </label>

        <label>
          ترتیب
          <input
            type="number"
            min={0}
            max={100}
            value={position}
            onChange={(event) => setPosition(Number(event.target.value))}
          />
        </label>
      </div>

      <label>
        Base URL
        <input
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
          placeholder="https://.../v1"
        />
      </label>

      <div className="form-grid">
        <label>
          متغیر کلید API
          <input
            value={apiKeyEnv}
            onChange={(event) => setApiKeyEnv(event.target.value)}
            placeholder="PROVIDER_API_KEY"
          />
        </label>

        <label>
          Timeout
          <input
            type="number"
            min={1000}
            max={120000}
            value={timeoutMs}
            onChange={(event) => setTimeoutMs(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="actions">
        <button
          type="button"
          disabled={
            name.trim().length < 2 ||
            !baseUrl.trim() ||
            !model.trim()
          }
          onClick={() => void create()}
        >
          ساخت Provider غیرفعال
        </button>
        {status && <small>{status}</small>}
      </div>
    </section>
  );
}
