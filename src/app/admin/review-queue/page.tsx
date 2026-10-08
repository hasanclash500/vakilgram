import type { Prisma } from "@/generated/prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReviewDecisionButtons } from "../components/review-decision-buttons";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function recordValue(
  value: Prisma.JsonValue | null
): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function numberValue(
  value: Prisma.JsonValue | null,
  key: string
): number | null {
  const record = recordValue(value);
  const item = record?.[key];
  return typeof item === "number" ? item : null;
}

function stringValue(
  value: Prisma.JsonValue | null,
  key: string
): string | null {
  const record = recordValue(value);
  const item = record?.[key];
  return typeof item === "string" ? item : null;
}

function previewJson(value: Prisma.JsonValue | null): string {
  if (value === null) return "—";
  const text = JSON.stringify(value, null, 2);
  return text.length > 6000 ? text.slice(0, 6000) + "\n…" : text;
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
        .filter(
          (item) =>
            item.kind === "ARTICLE_UPDATE" ||
            item.kind === "ARTICLE_UPDATE_STAGED"
        )
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
        <h1>تغییرات قوانین</h1>
        <p>
          تغییراتی که از Adapter فاز ۲ می‌آیند قبل از انتشار در این صف
          متوقف می‌شوند. تأیید، نسخه جدید را اعمال و ایندکس را بازسازی
          می‌کند؛ رد کردن متن جاری قانون را تغییر نمی‌دهد.
        </p>
      </header>

      <section className="review-list">
        {items.map((item) => {
          const article = articleById.get(item.entityId);
          const staged = item.kind.endsWith("_STAGED");
          const legacyBeforeVersion = numberValue(
            item.beforeData,
            "version"
          );
          const legacyAfterVersion = numberValue(
            item.afterData,
            "version"
          );
          const beforeVersion = article?.versions.find(
            (version) => version.version === legacyBeforeVersion
          );
          const afterVersion = article?.versions.find(
            (version) => version.version === legacyAfterVersion
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

              {staged ? (
                <>
                  <div className="review-diff">
                    <section className="review-version">
                      <h3>وضعیت فعلی</h3>
                      <pre>{previewJson(item.beforeData)}</pre>
                    </section>
                    <section className="review-version">
                      <h3>پیشنهاد Adapter</h3>
                      <pre>{previewJson(item.afterData)}</pre>
                    </section>
                  </div>

                  {item.status === "PENDING" && (
                    <ReviewDecisionButtons reviewId={item.id} />
                  )}
                </>
              ) : article && beforeVersion && afterVersion ? (
                <div className="review-diff">
                  <section className="review-version">
                    <h3>قبل · نسخه {beforeVersion.version}</h3>
                    <pre>{beforeVersion.text}</pre>
                  </section>
                  <section className="review-version">
                    <h3>بعد · نسخه {afterVersion.version}</h3>
                    <pre>{afterVersion.text}</pre>
                  </section>
                </div>
              ) : (
                <p className="disclaimer">
                  این رکورد قدیمی است یا داده کافی برای مقایسه ندارد.
                </p>
              )}

              {staged &&
                stringValue(item.afterData, "expectedChecksum") && (
                  <small>
                    stale guard:{" "}
                    {stringValue(
                      item.afterData,
                      "expectedChecksum"
                    )?.slice(0, 16)}
                    …
                  </small>
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
