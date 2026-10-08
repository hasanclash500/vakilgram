import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/api/auth/signin?callbackUrl=/admin");
  }

  const prisma = getPrisma();
  const [
    lawCount,
    articleCount,
    sourceCount,
    lawyerCount,
    pendingReviewCount,
    providerCount,
    auditCount
  ] = await Promise.all([
    prisma.law.count(),
    prisma.article.count(),
    prisma.source.count(),
    prisma.lawyer.count(),
    prisma.reviewQueue.count({ where: { status: "PENDING" } }),
    prisma.aiProviderConfig.count(),
    prisma.auditLog.count()
  ]);

  const cards = [
    {
      href: "/admin/laws",
      title: "قوانین و منابع",
      value: lawCount,
      detail: articleCount + " ماده · " + sourceCount + " منبع"
    },
    {
      href: "/admin/lawyers",
      title: "وکلا",
      value: lawyerCount,
      detail: "مدیریت تأیید و وضعیت"
    },
    {
      href: "/admin/ai",
      title: "هوش مصنوعی",
      value: providerCount,
      detail: "Provider و fallback"
    },
    {
      href: "/admin/featured",
      title: "سطح ویژه",
      value: "مدیریت",
      detail: "سطح، اولویت و اشتراک ویژه"
    },
    {
      href: "/admin/settings",
      title: "تنظیمات",
      value: "فاز ۱",
      detail: "Voice و هشدار حقوقی"
    },
    {
      href: "/admin/review-queue",
      title: "صف بازبینی",
      value: pendingReviewCount,
      detail: "تغییرات قوانین"
    },
    {
      href: "/admin/audit",
      title: "Audit log",
      value: auditCount,
      detail: "رویدادهای مدیریتی"
    },
    {
      href: "/admin/maintenance",
      title: "نگهداری",
      value: "DB",
      detail: "پاکسازی داده‌های موقت و telemetry"
    }
  ];

  return (
    <main className="shell">
      <header className="hero">
        <span className="eyebrow">پنل مدیریت · فاز ۱</span>
        <h1>مدیریت وکیل‌گرام</h1>
        <p>
          ورود به این بخش علاوه بر session، در هر API با نقش ADMIN
          دوباره کنترل می‌شود.
        </p>
      </header>

      <section className="admin-grid">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="admin-card">
            <strong>{card.title}</strong>
            <b>{card.value}</b>
            <small>{card.detail}</small>
          </Link>
        ))}
      </section>
    </main>
  );
}
