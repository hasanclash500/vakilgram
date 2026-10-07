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
      </header>

      <LegalAssistant />

      <footer>
        وکیل‌گرام جایگزین مشاوره رسمی وکیل یا بررسی پرونده توسط متخصص نیست.
      </footer>
    </main>
  );
}
