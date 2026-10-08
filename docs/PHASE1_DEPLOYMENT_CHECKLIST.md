# چک‌لیست استقرار فاز ۱ وکیل‌گرام

این راهنما برای بالا آوردن نسخه فعلی `main` از صفر تا smoke test نوشته شده است.

## ۱) زیرساخت

- Node.js 22 یا جدیدتر
- PostgreSQL سازگار با `pgvector`
- یک URL عمومی HTTPS برای برنامه
- دسترسی به GitHub Actions برای مشاهده CI

دو اتصال دیتابیس را تنظیم کنید:

- `DATABASE_URL`: اتصال runtime برنامه
- `DIRECT_URL`: اتصال مستقیم برای Prisma migration

migration اول افزونه `vector` را فعال می‌کند. کاربر دیتابیس باید اجازه `CREATE EXTENSION` داشته باشد یا افزونه از قبل فعال باشد.

## ۲) Environment

از `.env.example` شروع کنید و حداقل این موارد را مقداردهی کنید:

- `DATABASE_URL`
- `DIRECT_URL`
- `SITE_URL`
- `AUTH_SECRET`
- `VISITOR_HASH_SECRET`
- `ADMIN_EMAILS`

برای Google OAuth:

- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

برای Magic Link با Resend:

- `AUTH_RESEND_KEY`
- `EMAIL_FROM`

برای AI فقط کلیدهایی را تنظیم کنید که واقعاً استفاده می‌کنید. نام مدل و ترتیب Provider از پنل `/admin/ai` مدیریت می‌شود.

هیچ API key را داخل دیتابیس، seed، commit یا فرم پنل قرار ندهید.

## ۳) نصب و دیتابیس

```bash
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
```

ترتیب migrationهای فعلی:

1. `0000_extensions`: فعال‌سازی pgvector
2. `0001_initial_schema`: جداول اصلی و GIN index
3. `0002_api_rate_limits`: rate limit پایدار پرسش حقوقی

پس از migration:

```bash
npm run verify
```

## ۴) راه‌اندازی ادمین

1. ایمیل مدیر را در `ADMIN_EMAILS` قرار دهید.
2. برنامه را deploy کنید.
3. با Google یا Magic Link وارد شوید.
4. مسیر `/admin` را باز کنید.
5. بعد از اولین ورود، نقش ایمیل مجاز باید `ADMIN` شود.

APIهای ادمین مستقل از UI نقش `ADMIN` را دوباره از دیتابیس بررسی می‌کنند.

## ۵) Providerهای AI

در `/admin/ai`:

1. Provider موردنظر را انتخاب یا ایجاد کنید.
2. `baseUrl` و نام مدل را ثبت کنید.
3. در `apiKeyEnv` فقط نام متغیر محیطی را بنویسید؛ مثال: `OPENROUTER_API_KEY`.
4. ابتدا Provider را غیرفعال نگه دارید.
5. Environment مربوط به کلید را در سرور تنظیم کنید.
6. Provider را فعال کنید.
7. ترتیب fallback و timeout را تنظیم کنید.

برای RAG برداری حداقل یک Provider از نوع `EMBEDDING` لازم است. اگر embedding فعال نباشد یا خطا بدهد، retrieval متنی همچنان کار می‌کند.

## ۶) منابع و قوانین

در `/admin/laws`:

1. یک Source رسمی بسازید.
2. فقط وقتی منبع واقعاً معتبر است گزینه‌های «رسمی» و «فعال» را روشن نگه دارید.
3. قانون را دستی، JSON یا CSV وارد کنید.
4. وضعیت قانون را مشخص کنید:
   - `ACTIVE`
   - `AMENDED`
   - `REPEALED`
   - `UNKNOWN`
5. پیش‌نمایش را قبل از ثبت بررسی کنید.

RAG و صفحات عمومی فقط داده Sourceهای `official=true` و `enabled=true` را استفاده می‌کنند.

فایل‌های `examples/` صرفاً قالب ساختگی‌اند و برای تست ساختار هستند؛ آن‌ها را به‌عنوان قانون واقعی منتشر نکنید.

## ۷) وکلا

در `/admin/lawyers`:

- نام، slug، شماره پروانه، شهر/استان، بیو، تصویر، تخصص‌ها و لینک‌ها را ثبت کنید.
- فقط وکیل `verified=true` و `active=true` در دایرکتوری عمومی و پیشنهاد کنار پاسخ دیده می‌شود.

در `/admin/featured`:

- Tier بسازید.
- اولویت و هزینه هر کلیک را تنظیم کنید.
- Tier را به وکیل تخصیص دهید.

تبلیغ نباید محتوای پاسخ یا ترتیب منابع حقوقی را تغییر دهد.

## ۸) Voice

در `/admin/settings` گزینه Voice را فعال کنید.

مسیر Voice فاز ۱:

`مرورگر STT → API پرسش → همان RAG مستند → پاسخ → مرورگر TTS`

اگر مرورگر STT/TTS را پشتیبانی نکند، نسخه متنی باید بدون اختلال کار کند.

## ۹) Smoke test

این موارد را به‌ترتیب بررسی کنید:

1. `GET /api/health` باید HTTP 200 و `database: "ready"` بدهد.
2. `/laws` باید فقط قوانین Source رسمی/فعال را نشان دهد.
3. یک ماده را باز کنید و متن را با منبع رسمی مقایسه کنید.
4. یک سؤال مرتبط با همان ماده بپرسید.
5. پاسخ باید citation داخلی و متن ماده دیتابیس داشته باشد.
6. اگر citation معتبر باقی نماند، سیستم باید پاسخ «منبع مستند کافی پیدا نشد» بدهد.
7. Voice را امتحان کنید.
8. `/lawyers` را بررسی کنید.
9. روی کارت وکیل ویژه کلیک کنید و dedupe یک‌ساعته را بررسی کنید.
10. پس از بیش از حد مجاز پرسش در یک window، `/api/legal/ask` باید HTTP 429 بدهد.
11. `/sitemap.xml` و `/robots.txt` را باز کنید.
12. در `/admin/ai` health metrics Providerها را بررسی کنید.

## ۱۰) کنترل‌های حریم خصوصی

- متن سؤال کاربر در دیتابیس ذخیره نمی‌شود.
- `ai_usage_logs` فقط metadata عملیاتی و error code ثابت ذخیره می‌کند.
- IP خام برای rate limit یا dedupe کلیک ذخیره نمی‌شود.
- شناسه مرورگر قبل از ذخیره با HMAC هش می‌شود.
- endpoint پرسش `cache-control: no-store` دارد.

## ۱۱) قبل از انتشار عمومی

- `SITE_URL` را روی دامنه واقعی تنظیم کنید.
- `AUTH_SECRET` و `VISITOR_HASH_SECRET` را با مقادیر تصادفی بلند جایگزین کنید.
- هیچ مقدار `example.com` یا `replace-with...` باقی نماند.
- حداقل یک LLM Provider سالم فعال باشد.
- اگر semantic retrieval می‌خواهید، Embedding Provider سالم فعال باشد.
- قوانین واقعی را فقط پس از تطبیق با منبع رسمی منتشر کنید.
- آخرین GitHub Actions روی `main` باید سبز باشد.
