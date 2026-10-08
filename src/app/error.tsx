"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("app-render-error", {
      name: error.name,
      digest: error.digest ?? null
    });
  }, [error]);

  return (
    <main className="shell">
      <section className="assistant-card" role="alert">
        <span className="eyebrow">خطای موقت</span>
        <h1>نمایش این بخش با خطا روبه‌رو شد</h1>
        <p>
          جزئیات فنی خطا برای کاربر نمایش داده نمی‌شود. می‌توانید دوباره
          تلاش کنید یا به صفحه اصلی برگردید.
        </p>

        <div className="actions">
          <button type="button" onClick={reset}>
            تلاش دوباره
          </button>
          <Link href="/">صفحه اصلی</Link>
        </div>
      </section>
    </main>
  );
}
