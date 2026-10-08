"use client";

import { useState } from "react";

export function WalletAdjustmentForm({
  lawyerId,
  initialBalance
}: {
  lawyerId: string;
  initialBalance: string;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/admin/wallets/" + lawyerId + "/adjust",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ amount, description })
        }
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "تغییر موجودی انجام نشد.");
      }

      setBalance(body.balance);
      setAmount("");
      setDescription("");
      setMessage("تراکنش ثبت شد.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "خطای ناشناخته"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="wallet-adjustment">
      <strong>موجودی: {balance}</strong>

      <label>
        مبلغ
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="numeric"
          placeholder="مثبت برای افزایش، منفی برای کاهش"
        />
      </label>

      <label>
        توضیح
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={300}
          placeholder="علت تغییر موجودی"
        />
      </label>

      <button
        type="button"
        disabled={saving || !amount.trim() || description.trim().length < 3}
        onClick={() => void submit()}
      >
        {saving ? "در حال ثبت..." : "ثبت تراکنش"}
      </button>

      {message && <small>{message}</small>}
    </div>
  );
}
