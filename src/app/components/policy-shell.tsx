import Link from "next/link";
import type { ReactNode } from "react";

export function PolicyShell({
  eyebrow,
  title,
  children
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="shell">
      <p><Link href="/">بازگشت به وکیل‌گرام</Link></p>

      <header className="hero">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </header>

      <article className="assistant-card policy-content">
        {children}
      </article>

      <footer>
        <nav className="hero-links" aria-label="پیوندهای حقوقی">
          <Link href="/about">درباره وکیل‌گرام</Link>
          <Link href="/privacy">حریم خصوصی</Link>
          <Link href="/terms">شرایط استفاده</Link>
          <Link href="/disclaimer">سلب مسئولیت حقوقی</Link>
        </nav>
      </footer>
    </main>
  );
}
