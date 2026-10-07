import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { LAW_STATUS_LABELS } from "@/modules/laws/status";

export const dynamic = "force-dynamic";

async function getLaw(slug: string) {
  return getPrisma().law.findFirst({
    where: {
      slug,
      source: {
        official: true,
        enabled: true
      }
    },
    include: {
      source: {
        select: {
          name: true,
          baseUrl: true
        }
      },
      articles: {
        orderBy: { number: "asc" }
      }
    }
  });
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const law = await getLaw(slug);

  if (!law) {
    return { title: "قانون پیدا نشد | وکیل‌گرام" };
  }

  return {
    title: law.title + " | وکیل‌گرام",
    description:
      "متن مواد " + law.title + " بر اساس منبع رسمی ثبت‌شده در وکیل‌گرام"
  };
}

export default async function LawPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const law = await getLaw(slug);
  if (!law) notFound();

  return (
    <main className="shell">
      <p><Link href="/laws">بازگشت به قوانین</Link></p>

      <header className="hero">
        <span className="eyebrow">متن قانون</span>
        <h1>{law.title}</h1>
        <div>
          <span
            className={
              "law-status law-status-" + law.status.toLowerCase()
            }
          >
            {LAW_STATUS_LABELS[law.status] ?? law.status}
          </span>
        </div>
        <p>
          منبع: {law.source.name}
          {law.sourceUrl && (
            <>
              {" · "}
              <a
                href={law.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                صفحه رسمی قانون
              </a>
            </>
          )}
        </p>
        {law.status === "REPEALED" && (
          <p className="law-warning">
            این قانون در پایگاه به‌عنوان منسوخ ثبت شده است.
          </p>
        )}
      </header>

      <section className="law-list">
        {law.articles.map((article) => (
          <article
            id={"article-" + article.id}
            className="law-article"
            key={article.id}
          >
            <h2>
              ماده {article.number}
              {article.title ? " — " + article.title : ""}
            </h2>
            <p className="law-article-text">{article.text}</p>
            {article.sourceUrl && (
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                منبع رسمی ماده
              </a>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
