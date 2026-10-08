import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="shell">
      <section className="assistant-card">
        <span className="eyebrow">خطای ۴۰۴</span>
        <h1>صفحه پیدا نشد</h1>
        <p>
          نشانی واردشده وجود ندارد یا این صفحه دیگر در دسترس نیست.
        </p>

        <div className="actions">
          <Link href="/">بازگشت به صفحه اصلی</Link>
          <Link href="/laws">مرور قوانین</Link>
          <Link href="/lawyers">دایرکتوری وکلا</Link>
        </div>
      </section>
    </main>
  );
}
