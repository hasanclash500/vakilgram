"use client";

import { useState } from "react";

export function LawyerStatusEditor({
  id,
  initialVerified,
  initialActive
}: {
  id: string;
  initialVerified: boolean;
  initialActive: boolean;
}) {
  const [verified, setVerified] = useState(initialVerified);
  const [active, setActive] = useState(initialActive);
  const [status, setStatus] = useState<string | null>(null);

  async function save(nextVerified = verified, nextActive = active) {
    setStatus("در حال ذخیره...");

    const response = await fetch("/api/admin/lawyers/" + id, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        verified: nextVerified,
        active: nextActive
      })
    });

    const body = await response.json();
    setStatus(response.ok ? "ذخیره شد." : body.error ?? "خطا");
  }

  return (
    <div className="status-controls">
      <label>
        <input
          type="checkbox"
          checked={verified}
          onChange={(event) => {
            const value = event.target.checked;
            setVerified(value);
            void save(value, active);
          }}
        />
        تأییدشده
      </label>
      <label>
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => {
            const value = event.target.checked;
            setActive(value);
            void save(verified, value);
          }}
        />
        فعال
      </label>
      {status && <small>{status}</small>}
    </div>
  );
}
