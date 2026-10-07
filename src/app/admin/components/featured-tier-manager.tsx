"use client";

import { useState } from "react";

type Tier = {
  id: string;
  name: string;
  priority: number;
  costPerClick: string;
  active: boolean;
};

function TierEditor({
  initial,
  onSaved
}: {
  initial: Tier;
  onSaved: (tier: Tier) => void;
}) {
  const [tier, setTier] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    setStatus("در حال ذخیره...");

    const response = await fetch(
      "/api/admin/featured/tiers/" + tier.id,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: tier.name,
          priority: tier.priority,
          costPerClick: tier.costPerClick,
          active: tier.active
        })
      }
    );

    const body = await response.json();
    if (!response.ok) {
      setStatus(body.error ?? "خطا");
      return;
    }

    const saved = {
      ...body.tier,
      costPerClick: String(body.tier.costPerClick)
    } as Tier;
    setTier(saved);
    onSaved(saved);
    setStatus("ذخیره شد.");
  }

  return (
    <article className="admin-editor">
      <label>
        نام سطح
        <input
          value={tier.name}
          onChange={(event) =>
            setTier((current) => ({
              ...current,
              name: event.target.value
            }))
          }
        />
      </label>

      <div className="form-grid">
        <label>
          اولویت
          <input
            type="number"
            min={0}
            value={tier.priority}
            onChange={(event) =>
              setTier((current) => ({
                ...current,
                priority: Number(event.target.value)
              }))
            }
          />
        </label>

        <label>
          هزینه هر کلیک
          <input
            inputMode="numeric"
            value={tier.costPerClick}
            onChange={(event) =>
              setTier((current) => ({
                ...current,
                costPerClick: event.target.value.replace(/\D/g, "")
              }))
            }
          />
        </label>
      </div>

      <label className="check-row">
        <input
          type="checkbox"
          checked={tier.active}
          onChange={(event) =>
            setTier((current) => ({
              ...current,
              active: event.target.checked
            }))
          }
        />
        فعال
      </label>

      <div className="actions">
        <button type="button" onClick={() => void save()}>
          ذخیره سطح
        </button>
        {status && <small>{status}</small>}
      </div>
    </article>
  );
}

export function FeaturedTierManager({
  initialTiers
}: {
  initialTiers: Tier[];
}) {
  const [tiers, setTiers] = useState(initialTiers);
  const [name, setName] = useState("");
  const [priority, setPriority] = useState(10);
  const [costPerClick, setCostPerClick] = useState("0");
  const [status, setStatus] = useState<string | null>(null);

  async function create() {
    setStatus(null);

    const response = await fetch("/api/admin/featured/tiers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        priority,
        costPerClick,
        active: true
      })
    });

    const body = await response.json();
    if (!response.ok) {
      setStatus(body.error ?? "خطا");
      return;
    }

    const tier = {
      ...body.tier,
      costPerClick: String(body.tier.costPerClick)
    } as Tier;

    setTiers((current) => [...current, tier]);
    setName("");
    setCostPerClick("0");
    setStatus("سطح جدید ساخته شد.");
  }

  return (
    <section className="admin-stack">
      <section className="assistant-card">
        <h2>ساخت سطح ویژه</h2>
        <div className="form-grid">
          <label>
            نام
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            اولویت
            <input
              type="number"
              min={0}
              value={priority}
              onChange={(event) => setPriority(Number(event.target.value))}
            />
          </label>
          <label>
            هزینه هر کلیک
            <input
              inputMode="numeric"
              value={costPerClick}
              onChange={(event) =>
                setCostPerClick(event.target.value.replace(/\D/g, ""))
              }
            />
          </label>
        </div>
        <div className="actions">
          <button
            type="button"
            disabled={name.trim().length < 2 || !costPerClick}
            onClick={() => void create()}
          >
            ساخت سطح
          </button>
          {status && <small>{status}</small>}
        </div>
      </section>

      <section className="admin-editor-grid">
        {tiers.map((tier) => (
          <TierEditor
            key={tier.id}
            initial={tier}
            onSaved={(saved) =>
              setTiers((current) =>
                current.map((item) =>
                  item.id === saved.id ? saved : item
                )
              )
            }
          />
        ))}
      </section>
    </section>
  );
}
