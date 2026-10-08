import type { Metadata } from "next";
import Link from "next/link";
import { getPrisma } from "@/lib/db/prisma";
import { LAW_STATUS_LABELS } from "@/modules/laws/status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "قوانین و مقررات",
  description:
    "مرور قوانین و مواد ثبت‌شده از منابع رسمی و فعال در وکیل‌گرام",
  alternates: {
    canonical: "/laws"
  }
};

export default async function LawsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";

  const laws = await getPrisma().law.findMany({
    where: {
      source: {
        official: true,
        enabled: true
      },
      ...(query
        ? {
            title: {
              contains: query
            }
          }
        : {})
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      source: {
        select: {
          name: true,
          baseUrl: true
        }
      },
      _count: {
        select: { articles: true }
      }
    }
  });

  return (
    <main className="shell">
      <p><Link href="/">بازگشت به دستیار</Link></p>
      <header className="hero">
        <span className="eyebrow">پایگاه قوانین</span>
        <h1>قوانین و مقررات</h1>
        <p>
          فقط قوانین متصل به منبع رسمی و فعال در این فهرست نمایش داده
          می‌شوند.
        </p>
      </header>

      <form className="assistant-card" method="get">
        <label htmlFor="lawSearch">جست‌وجوی عنوان قانون</label>
        <input
          id="lawSearch"
          name="q"
          defaultValue={query}
          placeholder="عنوان قانون..."
        />
        <div className="actions">
          <button type="submit">جست‌وجو</button>
          {query && <Link href="/laws">حذف جست‌وجو</Link>}
        </div>
      </form>

      <section className="law-list">
        {laws.map((law) => (
          <Link
            href={"/laws/" + law.slug}
            key={law.id}
            className="law-list-item"
          >
            <h2>{law.title}</h2>
            <div>
              <span
                className={
                  "law-status law-status-" +
                  law.status.toLowerCase()
                }
              >
                {LAW_STATUS_LABELS[law.status] ?? law.status}
              </span>
            </div>
            <p>{law.source.name}</p>
            <small>{law._count.articles} ماده</small>
          </Link>
        ))}
      </section>

      {laws.length === 0 && (
        <p className="disclaimer">قانونی با این جست‌وجو پیدا نشد.</p>
      )}
    </main>
  );
}
