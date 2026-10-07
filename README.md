# وکیل‌گرام

پلتفرم فارسی RTL برای پاسخ حقوقی مستند، دستیار صوتی و معرفی وکلای تأییدشده.

> وضعیت: توسعه فاز ۱ روی شاخه `main` انجام می‌شود.

## پشته فنی

- Next.js 16.3.8 + React 19 + TypeScript
- PostgreSQL / Neon
- pgvector + tsvector
- Prisma ORM 7.10
- Auth.js v5 + Prisma Adapter
- Zod
- Vitest
- GitHub Actions

## قابلیت‌های فاز ۱

- RAG حقوقی ترکیبی: Full-text + Embedding + RRF
- پاسخ بندبه‌بند با citation معتبر به Articleهای بازیابی‌شده
- نمایش متن ماده فقط از دیتابیس
- ورود قانون به‌صورت دستی، JSON و CSV
- Source رسمی/فعال و نسخه‌بندی ماده
- صف بازبینی تغییرات مواد
- دایرکتوری و پروفایل عمومی وکلا
- مدیریت کامل پروفایل وکیل در پنل ادمین
- سطح ویژه، rotation و dedupe کلیک یک‌ساعته
- دستیار صوتی فارسی: STT مرورگر → همان RAG → TTS مرورگر
- Provider chain برای LLM و Embedding با fallback و health metrics
- Google OAuth و Magic Link با Resend
- RBAC ادمین و Audit log
- Security audit برای dependencyهای runtime

## قواعد صحت و حریم خصوصی

- متن پرسش کاربر به‌صورت پیش‌فرض در دیتابیس لاگ نمی‌شود.
- `ai_usage_logs` فقط Provider، latency، موفق/ناموفق بودن و کد خطا را نگه می‌دارد.
- RAG فقط از Sourceهای `official=true` و `enabled=true` بازیابی می‌کند.
- هر بند مدل باید حداقل یک `articleId` معتبر از context داشته باشد؛ بند بدون citation حذف می‌شود.
- متن ماده قانونی از خروجی مدل گرفته نمی‌شود.
- تبلیغات روی محتوای پاسخ یا ترتیب منابع حقوقی اثر ندارند.
- IP خام برای dedupe تبلیغ ذخیره نمی‌شود.
- API key داخل Git یا دیتابیس ذخیره نمی‌شود؛ فقط نام متغیر Environment در تنظیم Provider ثبت می‌شود.

## اجرای محلی

نیازمندی: Node.js 22 یا جدیدتر.

1. وابستگی‌ها را دقیقاً از lockfile نصب کنید:
   `npm ci`
2. `.env.example` را برای Next.js به `.env.local` و برای Prisma CLI به `.env` کپی کنید.
3. `DATABASE_URL` و `DIRECT_URL` را تنظیم کنید.
4. Prisma Client:
   `npm run db:generate`
5. دیتابیس توسعه:
   `npm run db:migrate -- --name local`
6. در صورت نیاز seed:
   `npm run db:seed`
7. اجرا:
   `npm run dev`

## استقرار

برای دیتابیس خالی، migrationهای commit‌شده را اجرا کنید:

`npx prisma migrate deploy`

ترتیب migrationها:
- `0000_extensions`: فعال‌سازی pgvector
- `0001_initial_schema`: schema کامل و GIN index جست‌وجوی متنی

سپس برنامه را build کنید:

`npm ci && npm run db:generate && npm run build`

## تست و CI

- `npm run typecheck`
- `npm test`
- `npm run build`

روی هر push به `main` و Pull Request، GitHub Actions این موارد را اجرا می‌کند و dependencyهای runtime را برای آسیب‌پذیری High/Critical audit می‌کند.

## متغیرهای مهم

به `.env.example` مراجعه کنید. برای ادمین، `ADMIN_EMAILS` را تنظیم کنید. برای Magic Link، `AUTH_RESEND_KEY` و `EMAIL_FROM` لازم است. Google OAuth فقط وقتی `AUTH_GOOGLE_ID` و `AUTH_GOOGLE_SECRET` تنظیم باشند فعال می‌شود.

## خارج از فاز ۱

چت مستقل، کیف پول فعال، نظرات فعال، OTP، پرداخت و ingestion زمان‌بندی‌شده در فازهای بعدی فعال می‌شوند؛ جداول لازم برای توسعه بعدی از ابتدا در schema در نظر گرفته شده‌اند.
