import type { Metadata } from "next";
import Link from "next/link";
import { featureEnabled } from "@/lib/features";
import { getPrisma } from "@/lib/db/prisma";
import { rankByBayesian, ratingStats } from "@/modules/reviews/ranking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "وکلای تأییدشده",
  description:
    "دایرکتوری وکلای تأییدشده و فعال ثبت‌شده در وکیل‌گرام",
  alternates: {
    canonical: "/lawyers"
  }
};

export default async function LawyersPage({
  searchParams
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const params = await searchParams;
  const city = params.city?.trim();
  const reviewsEnabled = featureEnabled("REVIEWS");
  const prisma = getPrisma();

  const [lawyers, globalReviewAggregate] = await Promise.all([
    prisma.lawyer.findMany({
      where: {
        active: true,
        verified: true,
        ...(city ? { city } : {})
      },
      include: {
        specialties: {
          select: { area: true }
        },
        reviews: {
          where: { hiddenAt: null },
          select: { rating: true }
        }
      },
      orderBy: {
        fullName: "asc"
      },
      take: 200
    }),
    reviewsEnabled
      ? prisma.review.aggregate({
          where: { hiddenAt: null },
          _avg: { rating: true }
        })
      : Promise.resolve({ _avg: { rating: null } })
  ]);

  const priorAverage = globalReviewAggregate._avg.rating ?? 3;

  const visibleLawyers = reviewsEnabled
    ? rankByBayesian(lawyers, priorAverage, 0, 50)
    : lawyers.slice(0, 50);

  return (
    <main className="shell">
      <header className="hero">
        <span className="eyebrow">دایرکتوری وکلا</span>
        <h1>وکلای تأییدشده</h1>
        <p>
          اطلاعات این صفحه فقط از پروفایل‌های تأییدشده پایگاه وکیل‌گرام
          خوانده می‌شود.
        </p>
      </header>

      <form className="assistant-card" method="get">
        <label htmlFor="city">فیلتر شهر</label>
        <input
          id="city"
          name="city"
          defaultValue={city ?? ""}
          placeholder="مثلاً تهران"
        />
        <div className="actions">
          <button type="submit">اعمال فیلتر</button>
          <Link href="/lawyers">حذف فیلتر</Link>
        </div>
      </form>

      <section className="lawyer-grid directory-grid">
        {visibleLawyers.map((lawyer) => {
          const stats = reviewsEnabled
            ? ratingStats(
                lawyer.reviews.map((review) => review.rating),
                priorAverage
              )
            : {
                count: 0,
                average: null,
                bayesian: null
              };

          return (
            <Link
              key={lawyer.id}
              className="lawyer-card"
              href={`/lawyers/${lawyer.slug}`}
            >
              <strong>{lawyer.fullName}</strong>
              <span className="verified">تأییدشده</span>
              <p>
                {lawyer.city}
                {lawyer.province ? `، ${lawyer.province}` : ""}
              </p>

              {stats.count > 0 && stats.bayesian !== null && (
                <small className="rating-summary">
                  ★ {Math.round(stats.bayesian * 100) / 100} از ۵ ·{" "}
                  {stats.count} نظر
                </small>
              )}

              {lawyer.specialties.length > 0 && (
                <small>
                  {lawyer.specialties
                    .map((item) => item.area)
                    .join(" · ")}
                </small>
              )}
            </Link>
          );
        })}
      </section>

      {visibleLawyers.length === 0 && (
        <p className="disclaimer">
          وکیل تأییدشده‌ای با این فیلتر پیدا نشد.
        </p>
      )}
    </main>
  );
}
