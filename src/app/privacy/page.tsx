import type { Metadata } from "next";
import { PolicyShell } from "../components/policy-shell";

export const metadata: Metadata = {
  title: "حریم خصوصی",
  description: "نحوه پردازش داده‌ها و حریم خصوصی در وکیل‌گرام",
  alternates: { canonical: "/privacy" }
};

export default function PrivacyPage() {
  const contactEmail = process.env.PRIVACY_CONTACT_EMAIL?.trim();

  return (
    <PolicyShell eyebrow="حریم خصوصی" title="نحوه پردازش داده‌ها">
      <h2>پرسش حقوقی</h2>
      <p>
        متن پرسش به‌صورت پیش‌فرض در دیتابیس وکیل‌گرام ذخیره نمی‌شود. برای
        تولید پاسخ، پرسش و بخش‌های لازم از مواد بازیابی‌شده به Provider
        هوش مصنوعی فعالی که مدیر سامانه تنظیم کرده ارسال می‌شوند. سیاست
        نگهداری داده آن Provider مستقل از وکیل‌گرام است و باید هنگام
        انتخاب Provider بررسی شود.
      </p>

      <h2>لاگ هوش مصنوعی</h2>
      <p>
        لاگ عملیاتی AI متن پرسش یا پاسخ را نگه نمی‌دارد؛ فقط نوع Provider،
        موفق یا ناموفق بودن، latency و کد خطای عمومی و پاک‌سازی‌شده ثبت
        می‌شود.
      </p>

      <h2>شناسه مرورگر و کلیک تبلیغ</h2>
      <p>
        یک cookie با نام <code>vg_vid</code> برای rate-limit و جلوگیری از
        شمارش تکراری کلیک تبلیغ استفاده می‌شود. وکیل‌گرام IP خام را برای
        این دو کاربرد در دیتابیس ذخیره نمی‌کند؛ شناسه مرورگر قبل از ثبت
        با HMAC هش می‌شود.
      </p>

      <h2>Voice</h2>
      <p>
        تشخیص گفتار و خواندن پاسخ در فاز ۱ از Web Speech API مرورگر
        استفاده می‌کند. پردازش صوت ممکن است بسته به مرورگر، سیستم‌عامل و
        سرویس سازنده مرورگر انجام شود و تابع سیاست حریم خصوصی همان سرویس
        باشد.
      </p>

      <h2>ورود حساب</h2>
      <p>
        در صورت فعال بودن Google OAuth یا Magic Link، اطلاعات لازم برای
        حساب و session مانند ایمیل، نام، تصویر و توکن‌های فنی احراز هویت
        طبق نیاز Auth.js ذخیره می‌شوند.
      </p>

      <h2>نگهداری داده عملیاتی</h2>
      <p>
        مدیر سامانه ابزار پاکسازی rate-limit و telemetry AI را دارد.
        مقدارهای پیش‌فرض رابط مدیریت ۴۸ ساعت برای داده rate-limit و ۹۰
        روز برای telemetry است؛ Audit log در این پاکسازی حذف نمی‌شود.
      </p>

      <h2>تماس حریم خصوصی</h2>
      {contactEmail ? (
        <p>
          برای درخواست مرتبط با داده‌های شخصی:{" "}
          <a href={"mailto:" + contactEmail}>{contactEmail}</a>
        </p>
      ) : (
        <p className="law-warning">
          نشانی تماس حریم خصوصی هنوز توسط مدیر استقرار تنظیم نشده است و
          باید پیش از انتشار عمومی با PRIVACY_CONTACT_EMAIL تکمیل شود.
        </p>
      )}
    </PolicyShell>
  );
}
