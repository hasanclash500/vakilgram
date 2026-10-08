import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db/prisma";
import { safeJsonLd } from "@/lib/seo/safe-json-ld";
import { isHttpUrl } from "@/lib/url/http";
import { featureEnabled } from "@/lib/features";
import { StartLawyerChat } from "@/app/components/start-lawyer-chat";
import { getLawyerReviewSummary } from "@/modules/reviews/service";

export const dynamic = "force-dynamic";

async function getLawyer(slug: string) {
  return getPrisma().lawyer.findFirst({
    where: {
      slug,
      active: true,
      verified: true
    },
    include: {
      specialties: {
        select: { area: true }
      },
      socialLinks: {
        select: {
          platform: true,
          url: true
        }
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
  const lawyer = await getLawyer(slug);

  if (!lawyer) {
    return {
      title: "وکیل پیدا نشد",
      robots: { index: false, follow: false }
    };
  }

  return {
    title: lawyer.fullName,
    description:
      lawyer.bio?.slice(0, 150) ??
      `پروفایل وکیل تأییدشده در ${lawyer.city}`,
    alternates: {
      canonical: "/lawyers/" + lawyer.slug
    }
  };
}

export default async function LawyerProfilePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lawyer = await getLawyer(slug);
  if (!lawyer) notFound();

  const reviewsEnabled = featureEnabled("REVIEWS");
  const prisma = getPrisma();

  const [reviewSummary, reviews] = reviewsEnabled
    ? await Promise.all([
        getLawyerReviewSummary(prisma, lawyer.id),
        prisma.review.findMany({
          where: {
            lawyerId: lawyer.id,
            hiddenAt: null
          },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            user: {
              select: { name: true }
            }
          }
        })
      ])
    : [
        {
          count: 0,
          average: null,
          bayesian: null,
          priorAverage: 3
        },
        []
      ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: lawyer.fullName,
    jobTitle: "وکیل",
    address: {
      "@type": "PostalAddress",
      addressLocality: lawyer.city,
      ...(lawyer.province
        ? { addressRegion: lawyer.province }
        : {})
    },
    ...(lawyer.avatarUrl && isHttpUrl(lawyer.avatarUrl)
      ? { image: lawyer.avatarUrl }
      : {}),
    ...(reviewSummary.count > 0 && reviewSummary.average !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviewSummary.average,
            reviewCount: reviewSummary.count,
            bestRating: 5,
            worstRating: 1
          }
        }
      : {})
  };

  return (
    <main className="shell">
      <article className="assistant-card profile">
        <span className="eyebrow">پروفایل تأییدشده</span>
        <h1>{lawyer.fullName}</h1>
        <p>
          {lawyer.city}
          {lawyer.province ? `، ${lawyer.province}` : ""}
        </p>

        {lawyer.licenseNumber && (
          <p>شماره پروانه: {lawyer.licenseNumber}</p>
        )}

        {lawyer.specialties.length > 0 && (
          <>
            <h2>حوزه‌های فعالیت</h2>
            <p>
              {lawyer.specialties
                .map((item) => item.area)
                .join(" · ")}
            </p>
          </>
        )}

        {lawyer.bio && (
          <>
            <h2>درباره وکیل</h2>
            <p>{lawyer.bio}</p>
          </>
        )}

        {reviewsEnabled && reviewSummary.count > 0 && (
          <>
            <h2>امتیاز کاربران</h2>
            <p className="rating-summary">
              <strong>{reviewSummary.bayesian} از ۵</strong>
              {" · "}
              {reviewSummary.count} نظر تأییدشده از تعامل واقعی
            </p>

            <div className="review-list">
              {reviews.map((review) => (
                <article className="review-card" key={review.id}>
                  <strong>{review.rating} از ۵</strong>
                  <small>
                    {review.user?.name ?? "کاربر تأییدشده"} ·{" "}
                    {review.createdAt.toLocaleDateString("fa-IR")}
                  </small>
                  {review.comment && <p>{review.comment}</p>}
                </article>
              ))}
            </div>
          </>
        )}

        {featureEnabled("CHAT") && lawyer.userId && (
          <>
            <h2>گفت‌وگوی متنی</h2>
            <StartLawyerChat
              lawyerId={lawyer.id}
              lawyerName={lawyer.fullName}
            />
          </>
        )}

        {lawyer.socialLinks.length > 0 && (
          <>
            <h2>پیوندها</h2>
            <div className="actions">
              {lawyer.socialLinks.filter((link) => isHttpUrl(link.url)).map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {link.platform}
                </a>
              ))}
            </div>
          </>
        )}
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(structuredData)
        }}
      />
    </main>
  );
}
