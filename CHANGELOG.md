# Changelog

تمام تغییرات مهم وکیل‌گرام در این فایل ثبت می‌شوند.

## 0.2.0 — 2026-10-08

نسخه کدکامل فاز ۲: درآمد و تعامل.

### درآمد و کیف پول

- کیف پول فعال برای هر وکیل و ledger تراکنش‌ها.
- شارژ/اصلاح موجودی توسط ادمین با idempotency.
- کسر خودکار CPC فقط روی کلیک معتبر و غیرتکراری.
- جلوگیری از منفی‌شدن موجودی و قفل همزمانی PostgreSQL.
- حذف وکیل ویژه فاقد موجودی کافی از جایگاه تبلیغاتی.
- مبلغ کلیک و تراکنش کیف پول در یک transaction ثبت می‌شوند.
- درگاه پرداخت عمداً در این فاز ساخته نشده است.

### نظرات و امتیاز

- ثبت نظر فقط بعد از گفت‌وگوی واقعی دوطرفه و بسته‌شده.
- یک نظر برای هر تعامل.
- پنهان‌کردن نظر توسط ادمین فقط با دلیل ثبت‌شده.
- امتیاز بیزی/وزن‌دار برای کاهش اثر نمونه‌های کوچک.
- رتبه‌بندی وکلای غیرتبلیغاتی و دایرکتوری بر اساس امتیاز بیزی.
- rotation فقط داخل گروه‌های هم‌امتیاز؛ پرداخت روی منابع یا پاسخ حقوقی اثر ندارد.

### چت

- چت متنی بین کاربر و وکیل متصل به حساب.
- ذخیره پیام‌ها فقط پس از رضایت صریح کاربر.
- کنترل دسترسی فقط برای دو طرف مکالمه.
- بستن گفتگو و استفاده از تعامل دوطرفه برای eligibility نظر.

### به‌روزرسانی قوانین

- تنظیم adapter دستی JSON/CSV برای Source رسمی.
- fetch محدودشده با timeout، سقف ۲MB، بدون redirect و same-origin با Source.
- diff و staging بدون تغییر فوری متن جاری قانون.
- صف بازبینی با تأیید/رد ادمین.
- stale guard برای نسخه ماده و metadata قانون.
- ساخت ArticleVersion و reindex فقط بعد از تأیید.
- IngestionRun/IngestionItem برای وضعیت اجرا.
- زمان‌بندی خودکار عمداً برای فاز ۳ باقی مانده است.

### پنل وکیل

- ثبت و ویرایش self-service پروفایل با Email/Google session.
- تغییر شماره پروانه، تأیید قبلی را برای بررسی مجدد برمی‌دارد.
- داشبورد موجودی، تراکنش‌ها، کلیک‌ها، امتیاز، جایگاه ویژه و چت.
- ورود گروهی CSV ادمین تا ۵۰۰ ردیف بدون auto-verify.
- اتصال امن پروفایل واردشده به حساب کاربری موجود توسط ادمین.

### امنیت ادمین

- TOTP 2FA با secret رمزنگاری‌شده AES-256-GCM.
- recovery codeهای هش‌شده و یک‌بارمصرف.
- cookie عامل دوم HttpOnly/SameSite=Strict.
- rate limit پایدار ۵ تلاش در ۱۰ دقیقه برای enable/verify.
- enforcement مرکزی روی UI و API ادمین.

### تست و عملیات

- migration فاز ۲ برای wallet/chat/reviews/admin 2FA.
- تست‌های واحد برای ranking، CSV و منطق حساس.
- integration واقعی PostgreSQL+pgvector برای Wallet، Chat، Reviews، 2FA، update-laws، CSV و owner-link.
- CI شامل audit امنیتی، typecheck، Vitest، build، Playwright و DB integration.

### عمداً خارج از فاز ۲

- OTP.
- درگاه پرداخت رسمی.
- adapterهای زمان‌بندی‌شده و auto-update.
- رأی وحدت رویه و نظریات مشورتی.
- reranking/evaluation خودکار فاز ۳.
- PWA، اپ موبایل و API عمومی.

## 0.1.0 — 2026-10-08

نسخه کدکامل فاز ۱.

### افزوده شد

- رابط فارسی RTL با Next.js و React.
- PostgreSQL/Neon با Prisma و pgvector.
- migrationهای قابل استقرار برای extension، schema اصلی و rate limit.
- RAG ترکیبی Full-text + Embedding + RRF.
- grounding بندبه‌بند؛ هر بند پاسخ باید citation معتبر از context داشته باشد.
- فیلتر Source رسمی/فعال در retrieval و صفحات عمومی.
- وضعیت قانون: جاری، اصلاح‌شده، منسوخ و نامشخص.
- ورود قانون به‌صورت دستی، JSON، CSV و فایل محلی.
- versioning و checksum مواد و صف مشاهده تغییرات.
- reindex batch‌شده مواد برای Full-text و Embedding.
- صفحات عمومی قوانین و لینک داخلی citation به ماده.
- دایرکتوری و صفحات عمومی وکلای تأییدشده.
- CRUD کامل پروفایل وکیل در ادمین.
- سطوح ویژه، rotation و شمارش کلیک تبلیغ با dedupe یک‌ساعته.
- advisory lock دیتابیس برای جلوگیری از duplicate همزمان کلیک ویژه.
- Google OAuth و Magic Link با Resend.
- RBAC ادمین و Audit log.
- Provider chain برای LLM و Embedding با fallback، timeout و health metrics.
- telemetry AI بدون ذخیره پرسش/پاسخ و با error code پاک‌سازی‌شده.
- دستیار صوتی فارسی در فاز ۱ با Web Speech API مرورگر.
- کنترل شروع/توقف STT و TTS و پیام‌های خطای فارسی.
- تنظیم runtime برای Voice و هشدار حقوقی.
- rate limit پایدار API پرسش با شناسه HMAC‌شده و بدون IP خام.
- ابزار نگهداری برای پاکسازی rate-limit و AI telemetry.
- صفحه readiness ادمین بدون نمایش secret.
- sitemap، robots، canonical، JSON-LD و صفحات حقوقی/حریم خصوصی.
- headerهای امنیتی پایه.
- صفحه 404 و error boundary فارسی.
- جست‌وجو، فیلتر و صفحه‌بندی مدیریت قوانین و وکلا.
- GitHub Actions شامل runtime security audit، typecheck، Vitest، production build، Playwright و integration test با PostgreSQL+pgvector.
- Dependabot هفتگی برای npm و GitHub Actions.

### قواعد ایمنی داده

- متن پرسش کاربر به‌صورت پیش‌فرض در دیتابیس ذخیره نمی‌شود.
- متن قانون از مدل AI تولید نمی‌شود.
- Provider API key در Git یا دیتابیس ذخیره نمی‌شود.
- IP خام برای rate limit یا dedupe تبلیغ ذخیره نمی‌شود.
- تبلیغ روی محتوای پاسخ یا ترتیب منابع حقوقی اثر ندارد.
- پاسخ بدون citation معتبر منتشر نمی‌شود.

### نیازمند تنظیم اپراتور

- دامنه واقعی در `SITE_URL`.
- دیتابیس production در `DATABASE_URL` و `DIRECT_URL`.
- `AUTH_SECRET` و `VISITOR_HASH_SECRET` تصادفی و بلند.
- حداقل یک روش ورود ادمین.
- حداقل یک LLM Provider سالم.
- Embedding Provider در صورت نیاز به semantic retrieval.
- ورود و تطبیق قوانین واقعی با منابع رسمی.
- ایمیل تماس حریم خصوصی.
- پروفایل‌های واقعی وکلا و وضعیت تأیید آن‌ها.

### عمداً خارج از فاز ۱

- چت مستقل با تاریخچه مکالمه.
- کیف پول عملیاتی.
- نظرات فعال کاربران.
- OTP.
- درگاه پرداخت.
- ingestion زمان‌بندی‌شده و auto-update.
- اپ موبایل/PWA و API عمومی.
