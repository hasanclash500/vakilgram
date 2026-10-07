"use client";

import { useState } from "react";

type Option = { id: string; label: string };

export function FeaturedAssignmentForm({
  lawyers,
  tiers
}: {
  lawyers: Option[];
  tiers: Option[];
}) {
  const [lawyerId, setLawyerId] = useState(lawyers[0]?.id ?? "");
  const [tierId, setTierId] = useState(tiers[0]?.id ?? "");
  const [status, setStatus] = useState<string | null>(null);

  async function submit() {
    const response = await fetch("/api/admin/featured/subscriptions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lawyerId, tierId, active: true })
    });

    const body = await response.json();
    setStatus(response.ok ? "سطح ویژه اعمال شد." : body.error ?? "خطا");
  }

  return (
    <section className="assistant-card">
      <h2>اعمال سطح ویژه</h2>
      <label>
        وکیل
        <select
          value={lawyerId}
          onChange={(event) => setLawyerId(event.target.value)}
        >
          {lawyers.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>

      <label>
        سطح
        <select
          value={tierId}
          onChange={(event) => setTierId(event.target.value)}
        >
          {tiers.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>

      <div className="actions">
        <button
          type="button"
          disabled={!lawyerId || !tierId}
          onClick={() => void submit()}
        >
          اعمال فوری
        </button>
        {status && <small>{status}</small>}
      </div>
    </section>
  );
}

export function FeaturedSubscriptionToggle({
  id,
  initialActive
}: {
  id: string;
  initialActive: boolean;
}) {
  const [active, setActive] = useState(initialActive);

  async function toggle() {
    const next = !active;
    const response = await fetch("/api/admin/featured/subscriptions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, active: next })
    });

    if (response.ok) setActive(next);
  }

  return (
    <button type="button" onClick={() => void toggle()}>
      {active ? "غیرفعال‌کردن" : "فعال‌کردن"}
    </button>
  );
}
