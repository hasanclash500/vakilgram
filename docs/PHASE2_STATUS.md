# وضعیت فاز ۲ وکیل‌گرام

تاریخ ارزیابی: 2026-10-08  
نسخه: `0.2.0`  
شاخه توسعه: `phase-2`

## نتیجه

فاز ۲ از نظر کد کامل است. انتشار واقعی همچنان نیازمند داده رسمی، Providerهای واقعی، Auth production و secrets امن است.

## ماتریس قابلیت‌ها

| حوزه | وضعیت | توضیح |
| --- | --- | --- |
| Wallet | کامل | ledger + موجودی + idempotency |
| کسر CPC | کامل | atomically با کلیک |
| جلوگیری از موجودی منفی | کامل | DB transaction + lock |
| Reviews | کامل | فقط تعامل واقعی |
| امتیاز بیزی | کامل | ranking organic + directory |
| Moderation | کامل | hide با دلیل |
| Chat | کامل | دوطرفه + consent |
| Law update adapter | کامل | JSON/CSV دستی |
| Diff/Review Queue | کامل | staging قبل از انتشار |
| Article versioning | کامل | apply فقط بعد از approve |
| Stale guard | کامل | Article و Law metadata |
| Ingestion run | کامل | وضعیت و itemها |
| پنل وکیل | کامل | self-service + stats |
| CSV وکلا | کامل | bulk import بدون auto-verify |
| اتصال حساب وکیل | کامل | admin-controlled |
| Admin 2FA | کامل | TOTP + recovery |
| 2FA rate limit | کامل | ۵ تلاش / ۱۰ دقیقه |
| Auto update زمان‌بندی‌شده | خارج از فاز | فاز ۳ |
| OTP | خارج از فاز | فاز ۳ |
| Payment gateway | خارج از فاز | فاز ۳ |

## تصمیم‌های ایمنی

- کیف پول اجازه مانده منفی نمی‌دهد.
- تکرار کلیک در window کسر مجدد ایجاد نمی‌کند.
- تبلیغ روی پاسخ حقوقی یا منابع اثر ندارد.
- Review فقط از Conversation بسته‌شده با پیام دوطرفه ساخته می‌شود.
- Chat بدون `consentToStore=true` ساخته نمی‌شود.
- Adapter تنها Source رسمی/فعال را می‌خواند.
- feed Adapter باید همان origin `baseUrl` باشد، redirect ممنوع و payload حداکثر ۲MB است.
- تغییر adapter مستقیماً قانون جاری را عوض نمی‌کند.
- نبودن یک ماده در feed به‌طور خودکار حذف/نسخ تلقی نمی‌شود؛ feed ممکن است جزئی باشد.
- CSV وکلا `verified=false` ایجاد می‌کند.
- اتصال حساب وکیل فقط به User موجود و با اقدام ادمین انجام می‌شود.
- TOTP secret رمزنگاری و recovery code هش می‌شود.

## Gateهای CI

1. runtime dependency audit
2. Prisma generate
3. TypeScript typecheck
4. Vitest
5. Next.js production build
6. Playwright Chromium
7. PostgreSQL 16 + pgvector
8. `prisma migrate deploy`
9. integration tests برای Wallet/Chat/Reviews/Law updates/2FA/CSV/ownership

## مواردی که اپراتور باید انجام دهد

- secrets واقعی Auth/2FA را تنظیم کند.
- حساب‌های وکیل را پس از اولین login به پروفایل‌های importشده متصل کند.
- کیف پول را فعلاً از پنل ادمین شارژ کند.
- Source رسمی و feed JSON/CSV قابل اعتماد را تنظیم کند.
- تغییرات قانون را از Review Queue بررسی کند.
- پروانه وکیل را دستی تأیید کند.
