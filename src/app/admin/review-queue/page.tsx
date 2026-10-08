import type { Prisma } from "@/generated/prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function versionFromJson(value: Prisma.JsonValue | null): number | null {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  const version = (value as Record<string, unknown>).version;
  return typeof version === "number" ? version : null;
}

function checksumFromJson(value: Prisma.JsonValue | null): string | null {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  const checksum = (value as Record<string, unknown>).checksum;
  return typeof checksum === "string" ? checksum : null;
}

export default async function ReviewQueuePage() {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/api/auth/signin?callbackUrl=/admin/review-queue");
  }

  const prisma = getPrisma();
  const items = await prisma.reviewQueue.findMany({
    orderBy: { createdAt: "desc" },
    take: 100
  });

  const articleIds = [
    ...new Set(
      items
        .filter((item) => item.kind === "ARTICLE_UPDATE")
        .map((item) => item.entityId)
    )
  ];

  const articles = articleIds.length
    ? await prisma.article.findMany({
        where: { id: { in: articleIds } },
        include: {
          law: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          },
          versions: {
            orderBy: { version: "desc" }
          }
        }
      })
    : [];

  const articleById = new Map(
    articles.map((article) => [article.id, article])
  );

  return (
    <main className="shell">
      <p><Link href="/admin">بازگشت به داشبورد</Link></p>

      <header className="hero">
        <span className="eyebrow">صف بازبینی</span>
        <h1>تغییرات نیازمند بررسی</h1>
        <p>
          در فاز ۱ این صفحه فقط برای مشاهده و مقایسه نسخه‌هاست. تأیید،
          رد یا rollback خودکار در فاز بعدی فعال می‌شود تا تغییر حقوقی
          بدون فرآیند بازبینی کامل برگشت داده نشود.
        </p>
      </header>

      <section className="review-list">
        {items.map((item) => {
          const article = articleById.get(item.entityId);
          const beforeVersion = versionFromJson(item.beforeData);
          const afterVersion = versionFromJson(item.afterData);
          const before = article?.versions.find(
            (version) => version.version === beforeVersion
          );
          const after = article?.versions.find(
            (version) => version.version === afterVersion
          );

          return (
            <article className="review-card" key={item.id}>
              <header>
                <div>
                  <strong>
                    {article
                      ? article.law.title + " — ماده " + article.number
                      : item.kind + " · " + item.entityId}
                  </strong>
                  <div className="review-meta">
                    {item.createdAt.toLocaleString("fa-IR")} · وضعیت{" "}
                    {item.status}
                  </div>
                </div>

                {article && (
                  <div className="hero-links">
                    <Link href={"/admin/laws/" + article.law.id}>
                      مدیریت قانون
                    </Link>
                    <Link
                      href={
                        "/laws/" +
                        article.law.slug +
                        "#article-" +
                        article.id
                      }
                    >
                      صفحه عمومی ماده
                    </Link>
                  </div>
                )}
              </header>

              {article && before && after ? (
                <div className="review-diff">
                  <section className="review-version">
                    <h3>قبل · نسخه {before.version}</h3>
                    <div className="review-meta">
                      checksum:{" "}
                      {checksumFromJson(item.beforeData)?.slice(0, 16) ??
                        before.checksum.slice(0, 16)}
                      …
                    </div>
                    <pre>{before.text}</pre>
                  </section>

                  <section className="review-version">
                    <h3>بعد · نسخه {after.version}</h3>
                    <div className="review-meta">
                      checksum:{" "}
                      {checksumFromJson(item.afterData)?.slice(0, 16) ??
                        after.checksum.slice(0, 16)}
                      …
                    </div>
                    <pre>{after.text}</pre>
                  </section>
                </div>
              ) : (
                <p className="disclaimer">
                  نسخه‌های لازم برای مقایسه این رکورد در دسترس نیستند.
                </p>
              )}
            </article>
          );
        })}
      </section>

      {items.length === 0 && (
        <p className="disclaimer">موردی در صف بازبینی وجود ندارد.</p>
      )}
    </main>
  );
}
