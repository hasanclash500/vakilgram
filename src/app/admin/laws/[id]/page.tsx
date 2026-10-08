import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LawMetadataEditor } from "../../components/law-metadata-editor";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";
import { LAW_STATUS_LABELS } from "@/modules/laws/status";

export const dynamic = "force-dynamic";

function dateInputValue(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export default async function AdminLawPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/api/auth/signin?callbackUrl=/admin/laws");
  }

  const { id } = await params;
  const law = await getPrisma().law.findUnique({
    where: { id },
    include: {
      source: {
        select: {
          name: true,
          official: true,
          enabled: true
        }
      },
      articles: {
        orderBy: { number: "asc" },
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 10
          }
        }
      }
    }
  });

  if (!law) notFound();

  return (
    <main className="shell">
      <p>
        <Link href="/admin/laws">بازگشت به قوانین</Link>
      </p>

      <header className="hero">
        <span className="eyebrow">مدیریت قانون</span>
        <h1>{law.title}</h1>
        <p>
          منبع: {law.source.name} ·{" "}
          {law.source.official ? "رسمی" : "غیررسمی"} ·{" "}
          {law.source.enabled ? "فعال" : "غیرفعال"}
        </p>
        <div className="hero-links">
          <Link href={"/laws/" + law.slug}>مشاهده صفحه عمومی</Link>
        </div>
      </header>

      <div className="admin-stack">
        <LawMetadataEditor
          law={{
            id: law.id,
            title: law.title,
            sourceUrl: law.sourceUrl,
            enactedAt: dateInputValue(law.enactedAt),
            effectiveAt: dateInputValue(law.effectiveAt),
            status: law.status
          }}
        />

        <section className="admin-table-wrap">
          <h2>مواد و نسخه‌ها</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ماده</th>
                <th>عنوان</th>
                <th>نسخه فعلی</th>
                <th>آخرین تغییر</th>
              </tr>
            </thead>
            <tbody>
              {law.articles.map((article) => (
                <tr key={article.id}>
                  <td>{article.number}</td>
                  <td>{article.title ?? "—"}</td>
                  <td>{article.currentVersion}</td>
                  <td>{article.updatedAt.toLocaleString("fa-IR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {law.articles.map((article) => (
          <section className="assistant-card" key={article.id}>
            <h2>
              ماده {article.number}
              {article.title ? " — " + article.title : ""}
            </h2>

            <p className="law-article-text">{article.text}</p>

            <details>
              <summary>
                تاریخچه نسخه‌ها ({article.versions.length} نسخه اخیر)
              </summary>

              <div className="version-list">
                {article.versions.map((version) => (
                  <article className="version-item" key={version.id}>
                    <strong>نسخه {version.version}</strong>
                    <small>
                      {version.createdAt.toLocaleString("fa-IR")}
                    </small>
                    <p className="law-article-text">{version.text}</p>
                    <code>{version.checksum}</code>
                  </article>
                ))}
              </div>
            </details>
          </section>
        ))}

        <p className="disclaimer">
          وضعیت فعلی: {LAW_STATUS_LABELS[law.status] ?? law.status}. ویرایش
          متن ماده از مسیر import رسمی انجام می‌شود تا version و checksum
          از بین نروند.
        </p>
      </div>
    </main>
  );
}
