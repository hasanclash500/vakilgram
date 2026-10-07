# وکیل‌گرام

پلتفرم فارسی RTL برای پاسخ حقوقی مستند و معرفی وکلا.

> وضعیت: فاز ۱ در حال پیاده‌سازی است. در این فاز، دستیار صوتی نیز به‌صورت رسمی فعال است.

## معماری فاز ۱

پشته:
- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- PostgreSQL/Neon + pgvector + tsvector
- Prisma ORM 7 (نسخه پایدار)
- Zod برای اعتبارسنجی
- Vitest + Playwright
- معماری Provider برای LLM، Embedding، Speech-to-Text و Text-to-Speech

ماژول‌ها:
- `legal-qa`: نرمال‌سازی، retrieval ترکیبی، RRF، پاسخ ساختاریافته و اعتبارسنجی سخت ارجاع
- `laws`: ورود دستی/فایلی، adapter منابع رسمی، نسخه‌بندی و صف بازبینی
- `lawyers`: پروفایل، تخصص، شهر، تأیید ادمین
- `ads`: سطح ویژه، rotation، ثبت کلیک و dedupe یک‌ساعته
- `voice`: ورودی صوتی → STT → همان RAG حقوقی → پاسخ متنی → TTS اختیاری
- `admin`: تنظیمات، منابع، AI providers، audit log
- `auth`: احراز هویت و RBAC

## جداول اصلی

`users`, `accounts`, `sessions`, `verification_tokens`,
`settings`, `sources`, `laws`, `articles`, `article_versions`,
`law_relations`, `ingestion_runs`, `ingestion_items`, `review_queue`,
`lawyers`, `lawyer_specialties`, `lawyer_social_links`,
`featured_tiers`, `lawyer_featured_subscriptions`, `ad_clicks`,
`reviews`, `conversations`, `messages`, `wallets`, `wallet_transactions`,
`ai_provider_configs`, `ai_usage_logs`, `audit_logs`.

## قواعد مهم

- متن پرسش و چت به‌صورت پیش‌فرض لاگ نمی‌شود.
- پاسخ حقوقی فقط با ارجاع به رکوردهای معتبر دیتابیس قابل نمایش است.
- متن ماده از دیتابیس نمایش داده می‌شود، نه از خروجی مدل.
- تبلیغات هیچ اثری بر محتوای پاسخ حقوقی و ترتیب منابع ندارند.
- هیچ کلید API داخل Git ذخیره نمی‌شود.
- داده نمونه باید صریحاً برچسب «نمونه ساختگی» داشته باشد.

## وضعیت قابلیت‌ها

- `FEATURE_VOICE=true` در فاز ۱
- چت مستقل، کیف پول فعال، نظرات فعال، OTP، پرداخت و به‌روزرسانی زمان‌بندی‌شده: فازهای بعد

## توسعه

شاخه اصلی `main` است. تغییرات فاز ۱ در commitهای کوچک و قابل بازگشت نگهداری می‌شوند.

### اجرای محلی

1. `npm install`
2. فایل `.env.example` را به `.env.local` کپی و مقادیر لازم را تنظیم کنید.
3. `npm run db:generate`
4. `npm run dev`
