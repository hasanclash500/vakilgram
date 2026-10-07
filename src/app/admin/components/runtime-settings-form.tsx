"use client";

import { useState } from "react";

export function RuntimeSettingsForm({
  initialVoiceEnabled,
  initialDisclaimer
}: {
  initialVoiceEnabled: boolean;
  initialDisclaimer: string;
}) {
  const [voiceEnabled, setVoiceEnabled] = useState(initialVoiceEnabled);
  const [disclaimer, setDisclaimer] = useState(initialDisclaimer);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          voiceEnabled,
          disclaimer
        })
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "خطا در ذخیره تنظیمات");
      }

      setStatus("تنظیمات ذخیره شد و از درخواست بعدی اعمال می‌شود.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "خطای ناشناخته"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="assistant-card">
      <h2>تنظیمات زمان اجرا</h2>

      <label className="check-row">
        <input
          type="checkbox"
          checked={voiceEnabled}
          onChange={(event) => setVoiceEnabled(event.target.checked)}
        />
        دستیار صوتی فعال باشد
      </label>

      <label htmlFor="legalDisclaimer">هشدار حقوقی</label>
      <textarea
        id="legalDisclaimer"
        rows={5}
        value={disclaimer}
        onChange={(event) => setDisclaimer(event.target.value)}
        maxLength={1200}
      />

      <div className="actions">
        <button
          type="button"
          disabled={saving || disclaimer.trim().length < 20}
          onClick={() => void save()}
        >
          {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
        </button>
        {status && <small>{status}</small>}
      </div>
    </section>
  );
}
