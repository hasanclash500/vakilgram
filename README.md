# وکیل‌گرام

پلتفرم فارسی RTL برای پاسخ حقوقی مستند، دستیار صوتی، تعامل کاربر و وکیل و مدل درآمد کلیکی.

> وضعیت: فاز ۲ در نسخه `0.2.0` روی شاخه `phase-2` کدکامل است. برای Production باید Environment، Providerهای AI، دیتابیس و داده حقوقی/وکلا با اطلاعات واقعی تنظیم شوند.

## پشته فنی

- Next.js 16.3.8 + React 19 + TypeScript
- PostgreSQL / Neon + pgvector + tsvector
- Prisma ORM 7.10
- Auth.js v5 + Prisma Adapter
- Zod
- Vitest + Playwright
- GitHub Actions

## قابلیت‌های فعال تا فاز ۲

### دستیار حقوقی

- RAG ترکیبی Full-text + Embedding + RRF
- grounding بندبه‌بند با citation معتبر
- متن ماده فقط از دیتابیس و Source رسمی/فعال
- نمایش وضعیت قانون و هشدار منسوخ
- دستیار صوتی فارسی: STT مرورگر → همان RAG → TTS مرورگر
- Provider chain برای LLM/Embedding با fallback و health metrics

### قوانین

- ورود دستی، JSON، CSV و فایل محلی
- versioning و checksum ماده
- Adapter دستی JSON/CSV برای Source رسمی
- دکمه بررسی به‌روزرسانی
- staging + diff + Review Queue
- approve/reject ادمین با stale guard
- reindex بعد از تأیید
- `FEATURE_AUTO_UPDATE=false`: زمان‌بندی خودکار در فاز ۳ است

### وکلا و درآمد

- دایرکتوری و صفحات عمومی وکلای تأییدشده
- پنل self-service وکیل
- ورود گروهی CSV توسط ادمین بدون auto-verify
- اتصال پروفایل واردشده به حساب کاربری موجود
- سطح ویژه و rotation
- کیف پول فعال و ledger
- کسر خودکار CPC روی کلیک معتبر
- dedupe یک‌ساعته و کنترل race با PostgreSQL advisory lock
- وکیل ویژه بدون موجودی کافی از جایگاه پولی حذف می‌شود

> موجودی و `costPerClick` به‌صورت عدد صحیح در «واحد اعتبار» نگهداری می‌شوند. این نسخه واحد را تومان/ریال فرض نمی‌کند. درگاه پرداخت در فاز ۳ اضافه می‌شود.

### تعامل

- چت متنی کاربر/وکیل با رضایت صریح برای ذخیره
- دسترسی مکالمه فقط برای دو طرف
- نظر فقط پس از تعامل واقعی دوطرفه و بسته‌شده
- یک نظر برای هر تعامل
- پنهان‌سازی نظر توسط ادمین با دلیل
- امتیاز بیزی و رتبه‌بندی وکلای غیرتبلیغاتی بر اساس ستاره واقعی

### امنیت و مدیریت

- Google OAuth و Magic Link با Resend
- RBAC در API
- TOTP 2FA ادمین + recovery code
- رمزنگاری secret عامل دوم با AES-256-GCM
- rate limit برای 2FA و API پرسش
- Audit log
- عدم لاگ متن پرسش
- telemetry AI بدون prompt/answer
- SEO، sitemap، robots، JSON-LD، صفحات حقوقی
- readiness و maintenance dashboard

## قواعد حریم خصوصی و صحت

- متن پرسش دستیار به‌صورت پیش‌فرض ذخیره نمی‌شود.
- چت فقط با رضایت صریح کاربر ذخیره می‌شود.
- متن قانون از مدل AI تولید نمی‌شود.
- پاسخ فاقد citation معتبر منتشر نمی‌شود.
- API key در Git یا دیتابیس ذخیره نمی‌شود.
- IP خام برای rate-limit یا کلیک ذخیره نمی‌شود.
- پرداخت و جایگاه تبلیغاتی روی محتوای پاسخ یا ترتیب منابع حقوقی اثر ندارند.
- CSV وکلا هیچ پروفایلی را خودکار تأیید نمی‌کند.

## اجرای محلی

نیازمندی: Node.js 22 یا جدیدتر.

1. `.env.example` را به `.env.local` و برای Prisma CLI به `.env` کپی کنید.
2. `DATABASE_URL` و `DIRECT_URL` را تنظیم کنید.
3. وابستگی‌ها:
   `npm ci`
4. Prisma Client:
   `npm run db:generate`
5. migration:
   `npm run db:deploy`
6. در صورت نیاز seed:
   `npm run db:seed`
7. اجرا:
   `npm run dev`

## migrationها

- `0000_extensions`: pgvector
- `0001_initial_schema`: schema اصلی + GIN index
- `0002_api_rate_limits`: rate limit پایدار
- `0003_phase2_foundation`: Wallet/Chat/Reviews metadata/Admin 2FA

## Feature Flags

- `FEATURE_VOICE=true`
- `FEATURE_WALLET=true`
- `FEATURE_REVIEWS=true`
- `FEATURE_CHAT=true`
- `FEATURE_AUTO_UPDATE=false`

## تست و CI

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e`
- `npm run test:integration`

GitHub Actions روی `main` و `phase-2` runtime dependency audit، TypeScript، Vitest، production build، Playwright و PostgreSQL+pgvector integration را اجرا می‌کند.

## راهنماها

- `docs/PHASE1_STATUS.md`
- `docs/PHASE1_DEPLOYMENT_CHECKLIST.md`
- `docs/PHASE2_STATUS.md`
- `docs/PHASE2_DEPLOYMENT_CHECKLIST.md`
- نمونه قانون: `examples/law-import.sample.json` و `examples/law-import.sample.csv`
- نمونه وکلا: `examples/lawyers-import.sample.csv`

## خارج از فاز ۲

OTP، درگاه پرداخت رسمی، update زمان‌بندی‌شده، adapterهای بیشتر خودکار، رأی وحدت رویه/نظریات مشورتی، reranking و ارزیابی خودکار، PWA/موبایل و API عمومی در این نسخه فعال نیستند.

## تاریخچه

به `CHANGELOG.md` مراجعه کنید.
