"use client";

import { useState } from "react";

type ProviderData = {
  id: string;
  name: string;
  kind: string;
  baseUrl: string;
  model: string;
  apiKeyEnv: string | null;
  position: number;
  enabled: boolean;
  timeoutMs: number;
};

export function AiProviderEditor({
  provider
}: {
  provider: ProviderData;
}) {
  const [form, setForm] = useState(provider);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof ProviderData>(
    key: K,
    value: ProviderData[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch(
        "/api/admin/ai/providers/" + provider.id,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            enabled: form.enabled,
            name: form.name,
            baseUrl: form.baseUrl,
            model: form.model,
            apiKeyEnv: form.apiKeyEnv || null,
            position: form.position,
            timeoutMs: form.timeoutMs
          })
        }
      );

      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "خطا در ذخیره");
      setStatus("ذخیره شد.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "خطای ناشناخته");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="admin-editor">
      <div className="editor-head">
        <strong>{provider.name}</strong>
        <span>{provider.kind}</span>
      </div>

      <label>
        مدل
        <input
          value={form.model}
          onChange={(event) => setField("model", event.target.value)}
        />
      </label>

      <label>
        Base URL
        <input
          value={form.baseUrl}
          onChange={(event) => setField("baseUrl", event.target.value)}
        />
      </label>

      <label>
        نام متغیر کلید API
        <input
          value={form.apiKeyEnv ?? ""}
          onChange={(event) =>
            setField("apiKeyEnv", event.target.value || null)
          }
          placeholder="OPENROUTER_API_KEY"
        />
      </label>

      <div className="inline-fields">
        <label>
          ترتیب
          <input
            type="number"
            min={0}
            max={100}
            value={form.position}
            onChange={(event) =>
              setField("position", Number(event.target.value))
            }
          />
        </label>

        <label>
          Timeout (ms)
          <input
            type="number"
            min={1000}
            max={120000}
            value={form.timeoutMs}
            onChange={(event) =>
              setField("timeoutMs", Number(event.target.value))
            }
          />
        </label>
      </div>

      <label className="check-row">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(event) => setField("enabled", event.target.checked)}
        />
        فعال
      </label>

      <div className="actions">
        <button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? "در حال ذخیره..." : "ذخیره"}
        </button>
        {status && <small>{status}</small>}
      </div>
    </article>
  );
}
