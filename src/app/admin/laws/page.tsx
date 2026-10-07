import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";
import { LawImportForm } from "../components/law-import-form";
import { SourceManager } from "../components/source-manager";

export const dynamic = "force-dynamic";

export default async function AdminLawsPage() {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/api/auth/signin?callbackUrl=/admin/laws");
  }

  const prisma = getPrisma();
  const [allSources, laws] = await Promise.all([
    prisma.source.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        baseUrl: true,
        sourceType: true,
        official: true,
        enabled: true
      }
    }),
    prisma.law.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        source: { select: { name: true } },
        _count: { select: { articles: true } }
      }
    })
  ]);

  const importSources = allSources
    .filter((source) => source.official && source.enabled)
    .map((source) => ({ id: source.id, name: source.name }));

  return (
    <main className="shell">
      <p><Link href="/admin">بازگشت به داشبورد</Link></p>
      <header className="hero">
        <span className="eyebrow">مدیریت قوانین</span>
        <h1>پایگاه قوانین</h1>
      </header>

      <div className="admin-stack">
        <SourceManager initialSources={allSources} />

        {importSources.length > 0 ? (
          <LawImportForm sources={importSources} />
        ) : (
          <section className="assistant-card">
            <strong>منبع رسمی فعالی تعریف نشده است.</strong>
            <p className="disclaimer">
              در بخش بالا یک منبع رسمی فعال ایجاد کنید.
            </p>
          </section>
        )}

        <section className="admin-table-wrap">
          <h2>آخرین قوانین</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>عنوان</th>
                <th>منبع</th>
                <th>مواد</th>
                <th>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {laws.map((law) => (
                <tr key={law.id}>
                  <td>{law.title}</td>
                  <td>{law.source.name}</td>
                  <td>{law._count.articles}</td>
                  <td>{law.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
