import Link from "next/link";
import { redirect } from "next/navigation";
import { MaintenanceCleanup } from "../components/maintenance-cleanup";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminMaintenancePage() {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/api/auth/signin?callbackUrl=/admin/maintenance");
  }

  const prisma = getPrisma();
  const [rateLimitRows, aiUsageRows, auditRows] = await Promise.all([
    prisma.apiRateLimit.count(),
    prisma.aiUsageLog.count(),
    prisma.auditLog.count()
  ]);

  return (
    <main className="shell">
      <p><Link href="/admin">بازگشت به داشبورد</Link></p>

      <header className="hero">
        <span className="eyebrow">نگهداری سیستم</span>
        <h1>پاکسازی و سلامت داده</h1>
        <p>
          این ابزار فقط داده‌های کوتاه‌عمر عملیاتی را پاک می‌کند و به
          محتوای حقوقی یا Audit log دست نمی‌زند.
        </p>
      </header>

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
