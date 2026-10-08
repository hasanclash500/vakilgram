import Link from "next/link";
import { redirect } from "next/navigation";
import { MaintenanceCleanup } from "../components/maintenance-cleanup";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";
import { getRuntimeSettings } from "@/lib/settings/runtime-settings";

export const dynamic = "force-dynamic";

function statusLabel(ready: boolean, optional = false) {
  if (ready) return "آماده";
  return optional ? "اختیاری / غیرفعال" : "نیازمند تنظیم";
}

export default async function AdminMaintenancePage() {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/api/auth/signin?callbackUrl=/admin/maintenance");
  }

  const prisma = getPrisma();

  const [
    rateLimitRows,
    aiUsageRows,
    auditRows,
    officialSourceCount,
    officialArticleCount,
    verifiedLawyerCount,
    enabledProviders,
    runtimeSettings
  ] = await Promise.all([
    prisma.apiRateLimit.count(),
    prisma.aiUsageLog.count(),
    prisma.auditLog.count(),
    prisma.source.count({
      where: {
        official: true,
        enabled: true
      }
    }),
    prisma.article.count({
      where: {
        law: {
          source: {
            official: true,
            enabled: true
          }
        }
      }
    }),
    prisma.lawyer.count({
      where: {
        verified: true,
        active: true
      }
    }),
    prisma.aiProviderConfig.findMany({
      where: {
        enabled: true
      },
      select: {
        kind: true,
        apiKeyEnv: true
      }
    }),
    getRuntimeSettings(prisma)
  ]);

  const providerReady = enabledProviders.filter((provider) => {
    if (!provider.apiKeyEnv) return true;
    return Boolean(process.env[provider.apiKeyEnv]?.trim());
  });

  const llmReadyCount = providerReady.filter(
    (provider) => provider.kind === "LLM"
  ).length;

  const embeddingReadyCount = providerReady.filter(
    (provider) => provider.kind === "EMBEDDING"
  ).length;

  const googleAuthReady = Boolean(
    process.env.AUTH_GOOGLE_ID?.trim() &&
      process.env.AUTH_GOOGLE_SECRET?.trim()
  );

  const magicLinkReady = Boolean(
    process.env.AUTH_RESEND_KEY?.trim() &&
      process.env.EMAIL_FROM?.trim()
  );

  const adminEmailReady = Boolean(process.env.ADMIN_EMAILS?.trim());
  const visitorSecretReady = Boolean(
    process.env.VISITOR_HASH_SECRET?.trim() ||
      process.env.CLICK_HASH_SECRET?.trim()
  );
  const siteUrlReady = Boolean(process.env.SITE_URL?.trim());
  const authReady = googleAuthReady || magicLinkReady;

  const publicationReady =
    officialSourceCount > 0 &&
    officialArticleCount > 0 &&
    llmReadyCount > 0 &&
    visitorSecretReady &&
    adminEmailReady &&
    authReady &&
    runtimeSettings.voiceEnabled &&
    siteUrlReady;

  const checks = [
    {
      title: "پایگاه قوانین",
      ready: officialSourceCount > 0 && officialArticleCount > 0,
      detail:
        officialSourceCount +
        " منبع رسمی فعال · " +
        officialArticleCount +
        " ماده"
    },
    {
      title: "LLM",
      ready: llmReadyCount > 0,
      detail: llmReadyCount + " Provider فعال با تنظیم قابل استفاده"
    },
    {
      title: "Embedding",
      ready: embeddingReadyCount > 0,
      optional: true,
      detail:
        embeddingReadyCount > 0
          ? embeddingReadyCount + " Provider آماده"
          : "جست‌وجوی متنی همچنان فعال است"
    },
    {
      title: "دستیار صوتی",
      ready: runtimeSettings.voiceEnabled,
      detail: runtimeSettings.voiceEnabled
        ? "در تنظیمات runtime فعال است"
        : "در تنظیمات runtime غیرفعال است"
    },
    {
      title: "ورود ادمین",
      ready: authReady && adminEmailReady,
      detail:
        (googleAuthReady ? "Google " : "") +
        (magicLinkReady ? "Magic Link " : "") +
        (adminEmailReady ? "· ADMIN_EMAILS تنظیم شده" : "")
    },
    {
      title: "شناسه امن مرورگر",
      ready: visitorSecretReady,
      detail: visitorSecretReady
        ? "HMAC secret تنظیم شده"
        : "VISITOR_HASH_SECRET تنظیم نشده"
    },
    {
      title: "دامنه عمومی",
      ready: siteUrlReady,
      detail: siteUrlReady
        ? "SITE_URL تنظیم شده"
        : "SITE_URL تنظیم نشده"
    },
    {
      title: "دایرکتوری وکلا",
      ready: verifiedLawyerCount > 0,
      optional: true,
      detail: verifiedLawyerCount + " وکیل تأییدشده و فعال"
    }
  ];

  return (
    <main className="shell">
      <p><Link href="/admin">بازگشت به داشبورد</Link></p>

      <header className="hero">
        <span className="eyebrow">نگهداری سیستم</span>
        <h1>سلامت و آمادگی انتشار</h1>
        <p>
          این صفحه فقط وضعیت آماده‌بودن اجزای اصلی را نشان می‌دهد و هیچ
          secret یا API key را نمایش نمی‌دهد.
        </p>
      </header>

      <section
        className={
          "assistant-card readiness-summary " +
          (publicationReady ? "readiness-ok" : "readiness-warn")
        }
      >
        <strong>
          {publicationReady
            ? "فاز ۱ از نظر تنظیمات اصلی آماده انتشار است."
            : "برای انتشار عمومی هنوز چند تنظیم اصلی ناقص است."}
        </strong>
        <p className="disclaimer">
          Embedding و وجود وکیل تأییدشده برای کارکرد پایه RAG الزامی نیستند؛
          موارد اجباری در محاسبه آمادگی انتشار جداگانه کنترل می‌شوند.
        </p>
      </section>

      <section className="admin-grid">
        {checks.map((check) => (
          <article className="admin-card" key={check.title}>
            <strong>{check.title}</strong>
            <b
              className={
                check.ready
                  ? "readiness-text-ok"
                  : check.optional
                    ? "readiness-text-optional"
                    : "readiness-text-warn"
              }
            >
              {statusLabel(check.ready, check.optional)}
            </b>
            <small>{check.detail}</small>
          </article>
        ))}
      </section>

      <section className="admin-grid">
        <article className="admin-card">
          <strong>Rate-limit</strong>
          <b>{rateLimitRows}</b>
          <small>رکورد موجود</small>
        </article>
        <article className="admin-card">
          <strong>AI telemetry</strong>
          <b>{aiUsageRows}</b>
          <small>رکورد موجود</small>
        </article>
        <article className="admin-card">
          <strong>Audit log</strong>
          <b>{auditRows}</b>
          <small>در پاکسازی حفظ می‌شود</small>
        </article>
      </section>

      <div className="admin-stack">
        <MaintenanceCleanup />
      </div>
    </main>
  );
}
