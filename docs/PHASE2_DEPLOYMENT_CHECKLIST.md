# چک‌لیست استقرار فاز ۲

## ۱) قبل از deploy

از نسخه `0.2.0` و migrationهای commit‌شده استفاده کنید.

Environmentهای پایه فاز ۱ به‌علاوه موارد زیر را تنظیم کنید:

```env
FEATURE_WALLET=true
FEATURE_REVIEWS=true
FEATURE_CHAT=true
FEATURE_AUTO_UPDATE=false

ADMIN_2FA_ENCRYPTION_KEY=<32-byte-base64>
ADMIN_2FA_COOKIE_SECRET=<long-random-secret>
```

برای تولید secret محلی:

```bash
openssl rand -base64 32
openssl rand -base64 48
```

هیچ‌کدام را در Git commit نکنید.

## ۲) migration

```bash
npm ci
npm run db:generate
npm run db:deploy
```

مطمئن شوید `0003_phase2_foundation` اعمال شده است.

## ۳) 2FA ادمین

1. با حساب ادمین وارد شوید.
2. مسیر ادمین شما را برای راه‌اندازی/چالش عامل دوم هدایت می‌کند.
3. TOTP را در authenticator ثبت کنید.
4. recovery codeها را خارج از سیستم و در محل امن نگهداری کنید.
5. چند کد اشتباه پشت‌سرهم باید rate limit شود.

## ۴) Wallet

- شارژ این نسخه از پنل ادمین انجام می‌شود.
- مبلغ‌ها «واحد اعتبار» هستند؛ قبل از استفاده واقعی قرارداد واحد مالی را در کسب‌وکار مشخص کنید.
- درگاه پرداخت در این فاز وجود ندارد.
- وکیل ویژه فاقد موجودی کافی نباید در slot پولی نمایش داده شود.

## ۵) وکلا

برای import گروهی از `examples/lawyers-import.sample.csv` به‌عنوان قالب استفاده کنید.

- داده نمونه ساختگی است.
- import هیچ وکیلی را verified نمی‌کند.
- بعد از login واقعی وکیل، ادمین می‌تواند ایمیل حساب را به پروفایل موجود متصل کند.
- پروانه باید جداگانه بررسی و verified شود.

## ۶) Chat و Review

- Chat فقط با رضایت صریح ذخیره فعال می‌شود.
- برای Review معتبر، Conversation باید بسته‌شده و دارای حداقل یک پیام از هر طرف باشد.
- هر interaction فقط یک Review دارد.
- مخفی‌کردن نظر باید دلیل داشته باشد.

## ۷) به‌روزرسانی قوانین

1. Source باید `official=true` و `enabled=true` باشد.
2. `baseUrl` را روی origin رسمی تنظیم کنید.
3. Adapter format و update feed را ثبت کنید.
4. feed باید روی همان origin باشد.
5. «بررسی به‌روزرسانی» را دستی اجرا کنید.
6. تغییرات را در `/admin/review-queue` بررسی کنید.
7. فقط پس از تأیید، نسخه ماده و index تغییر می‌کند.

در فاز ۲ هیچ cron/scheduler برای این کار فعال نیست.

## ۸) Smoke test

- `/api/health` → 200
- ادمین بدون 2FA فعال/challenge تکمیل‌شده نباید API حساس را استفاده کند.
- شارژ کیف پول و ledger را بررسی کنید.
- یک کلیک ویژه معتبر فقط یک بار در یک ساعت کسر شود.
- موجودی ناکافی باعث عدم نمایش/عدم کسر شود.
- Chat بدون consent رد شود.
- Chat دوطرفه را ببندید و یک Review ثبت کنید.
- Review دوم روی همان interaction رد شود.
- نظر را با دلیل hide کنید و از rating حذف‌شدنش را بررسی کنید.
- Adapter update را اجرا و بررسی کنید متن قانون قبل از Approve تغییر نکرده باشد.
- یک review stale باید با conflict رد شود.
- CSV وکیل را import کنید و بررسی کنید `verified=false` باشد.
- حساب موجود را به پروفایل وکیل وصل کنید.

## ۹) تست فنی

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:integration
```
