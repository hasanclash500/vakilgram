import Link from "next/link";
import { LegalAssistant } from "./components/legal-assistant";

export default function HomePage() {
  return (
    <main className="shell">
      <header className="hero">
        <span className="eyebrow">فاز ۱ · نسخه اولیه</span>
        <h1>وکیل‌گرام</h1>
        <p>
          پرسش حقوقی خود را بنویسید یا با صدا مطرح کنید. پاسخ فقط در صورت
          وجود منبع معتبر در پایگاه قوانین ارائه می‌شود.
        </p>
        <nav className="hero-links">
          <Link href="/laws">مرور قوانین</Link>
          <Link href="/lawyers">دایرکتوری وکلا</Link>
        </nav>
      </header>

      <LegalAssistant />

      <footer>
        <p>
          وکیل‌گرام جایگزین مشاوره رسمی وکیل یا بررسی پرونده توسط متخصص
          نیست.
        </p>
        <nav className="hero-links" aria-label="پیوندهای حقوقی">
          <Link href="/about">درباره</Link>
          <Link href="/privacy">حریم خصوصی</Link>
          <Link href="/terms">شرایط استفاده</Link>
          <Link href="/disclaimer">سلب مسئولیت</Link>
        </nav>
      </footer>
    </main>
  );
}
