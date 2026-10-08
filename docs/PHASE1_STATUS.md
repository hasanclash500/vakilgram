# وضعیت فاز ۱ وکیل‌گرام

تاریخ ارزیابی: 2026-10-08  
نسخه: `0.1.0`

## نتیجه

کد فاز ۱ کامل است و تمام gateهای CI فعلی را رد می‌کند. انتشار production همچنان به Environment واقعی، دیتابیس production، Providerهای AI و داده حقوقی معتبر نیاز دارد.

## ماتریس قابلیت‌ها

| حوزه | وضعیت | توضیح |
| --- | --- | --- |
| Next.js / TypeScript / RTL | کامل | رابط فارسی و RTL |
| Prisma + PostgreSQL | کامل | migrationهای commit‌شده |
| pgvector | کامل | extension و ستون vector |
| Full-text search | کامل | tsvector + GIN |
| Hybrid retrieval | کامل | Text + Embedding + RRF |
| Grounding | کامل | citation معتبر برای هر بند |
| قوانین رسمی | کامل | فقط Source رسمی/فعال |
| ورود دستی/JSON/CSV | کامل | همراه preview و validation |
| Versioning مواد | کامل | checksum و ArticleVersion |
| Reindex | کامل | batch‌شده از پنل |
| صفحات عمومی قوانین | کامل | status و لینک منبع |
| Voice | کامل فاز ۱ | STT/TTS مرورگر، همان RAG |
| دایرکتوری وکلا | کامل | فقط verified + active |
| CRUD وکیل | کامل | ادمین |
| تبلیغ ویژه | کامل فاز ۱ | rotation + dedupe |
| شمارش کلیک همزمان‌امن | کامل | PostgreSQL advisory lock |
| Auth | کامل | Google / Resend Magic Link |
| RBAC | کامل | API و UI ادمین |
| AI fallback | کامل | LLM/Embedding Provider chain |
| Health metrics | کامل | success/failure/latency |
| Privacy telemetry | کامل | بدون prompt/answer |
| Rate limit | کامل | DB-backed و HMAC visitor |
| Audit log | کامل | تغییرات مدیریتی حساس |
| SEO فنی | کامل | sitemap/robots/canonical |
| صفحات حقوقی سایت | کامل | About/Privacy/Terms/Disclaimer |
| Health endpoint | کامل | 200/503 بر اساس DB/migration |
| Maintenance | کامل | cleanup داده کوتاه‌عمر |
| Readiness dashboard | کامل | بدون نمایش secret |
| Unit tests | کامل | Vitest |
| Browser smoke tests | کامل | Playwright Chromium |
| DB integration | کامل | PostgreSQL+pgvector در CI |
| Runtime dependency audit | کامل | High/Critical gate |

## معیارهای پذیرش فاز ۱

### اجرا بدون سرویس پولی اجباری

معماری Provider اجازه می‌دهد مدل/سرویس قابل استفاده توسط اپراتور انتخاب شود. هیچ API key در کد hard-code نشده است. در نبود LLM فعال، دستیار به‌جای ساخت پاسخ، نبود منبع/امکان پاسخ مستند را اعلام می‌کند.

### پاسخ حقوقی مستند

- retrieval فقط از Source رسمی و فعال انجام می‌شود.
- مدل فقط Article IDهای context را مجاز به citation دارد.
- بند فاقد citation معتبر حذف می‌شود.
- متن ماده‌ای که به کاربر نشان داده می‌شود از دیتابیس است، نه خروجی مدل.
- وضعیت قانون در context و UI دیده می‌شود.
- قانون منسوخ با هشدار نمایش داده می‌شود.

### اطلاعات وکیل

- هیچ وکیل خارج از دیتابیس ساخته نمی‌شود.
- پیشنهاد عمومی فقط `verified=true` و `active=true` است.
- جایگاه تبلیغاتی برچسب دارد.
- کلیک کارت عادی تبلیغ شمرده نمی‌شود.
- API کلیک نیز فعال‌بودن اشتراک ویژه را دوباره بررسی می‌کند.

### dedupe کلیک

- window پیش‌فرض یک ساعت است.
- visitor ID قبل از ذخیره HMAC می‌شود.
- advisory lock دیتابیس race همزمان دو درخواست را کنترل می‌کند.
- integration test واقعی PostgreSQL این رفتار را بررسی می‌کند.

### ورود قوانین

- حداقل adapterهای JSON و CSV وجود دارند.
- ورود دستی و فایل محلی هم فراهم است.
- تغییر متن ماده version جدید و ReviewQueue ایجاد می‌کند.
- Source غیررسمی/غیرفعال اجازه import ندارد.

## Gateهای CI

هر push به `main` این مسیرها را اجرا می‌کند:

1. Runtime dependency security audit.
2. `npm ci`.
3. Prisma generate.
4. TypeScript typecheck.
5. Vitest.
6. Next.js production build.
7. Playwright Chromium smoke tests.
8. PostgreSQL 16 + pgvector service.
9. Prisma migrate deploy روی دیتابیس تست.
10. Database integration smoke.

## مراحل ضروری قبل از Production

1. `SITE_URL` را روی دامنه واقعی قرار دهید.
2. secrets نمونه را با مقادیر امن جایگزین کنید.
3. migrationها را با `npm run db:deploy` روی دیتابیس production اجرا کنید.
4. حداقل یک روش Auth را تنظیم کنید.
5. ایمیل ادمین را در `ADMIN_EMAILS` قرار دهید.
6. حداقل یک LLM Provider را با مدل معتبر و کلید Environment فعال کنید.
7. در صورت استفاده از semantic search یک Embedding Provider فعال کنید.
8. Sourceهای حقوقی واقعی را تعریف و قوانین را فقط از منبع رسمی وارد کنید.
9. وضعیت هر قانون را بررسی کنید.
10. وکلای واقعی را فقط پس از تأیید فعال کنید.
11. `PRIVACY_CONTACT_EMAIL` را تنظیم کنید.
12. صفحه `/admin/maintenance` باید موارد اجباری را آماده نشان دهد.
13. `/api/health` باید HTTP 200 بدهد.
14. smoke test راهنمای deployment را اجرا کنید.

## موارد خارج از فاز ۱

ساخت یا فعال‌سازی موارد زیر نیازمند شروع صریح فاز بعدی است:

- چت مستقل و ذخیره تاریخچه.
- Wallet فعال.
- Review فعال.
- OTP.
- Payment gateway.
- Scheduled ingestion / auto-update.
- Voice server-side یا مدل صوتی پولی.
- PWA/mobile.
- Public API.
