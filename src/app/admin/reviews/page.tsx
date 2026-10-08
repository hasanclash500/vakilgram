import Link from "next/link";
import { redirect } from "next/navigation";
import { ReviewModeration } from "../components/review-moderation";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";
import { featureEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/api/auth/signin?callbackUrl=/admin/reviews");
  }

  const reviews = await getPrisma().review.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      lawyer: {
        select: {
          fullName: true,
          slug: true
        }
      },
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  return (
    <main className="shell">
      <p><Link href="/admin">بازگشت به داشبورد</Link></p>

      <header className="hero">
        <span className="eyebrow">نظرات · فاز ۲</span>
        <h1>مدیریت نظرات و امتیازها</h1>
        <p>
          ادمین اجازه تغییر امتیاز یا متن نظر را ندارد. پنهان‌سازی فقط با
          دلیل مشخص انجام و در Audit log ثبت می‌شود.
        </p>
      </header>

      {!featureEnabled("REVIEWS") && (
        <p className="law-warning">
          FEATURE_REVIEWS غیرفعال است.
        </p>
      )}

      <section className="review-list">
        {reviews.map((review) => (
          <article className="review-card" key={review.id}>
            <header>
              <div>
                <strong>
                  {review.lawyer.fullName} · {review.rating} ستاره
                </strong>
                <div className="review-meta">
                  {review.user?.name ??
                    review.user?.email ??
                    "کاربر احراز هویت‌شده"}{" "}
                  · {review.createdAt.toLocaleString("fa-IR")}
                </div>
              </div>

              <Link href={"/lawyers/" + review.lawyer.slug}>
                پروفایل عمومی
              </Link>
            </header>

            {review.comment && <p>{review.comment}</p>}

            {review.hiddenAt && (
              <p className="law-warning">
                پنهان شده: {review.hiddenReason ?? "بدون دلیل ثبت‌شده"}
              </p>
            )}

            <ReviewModeration
              reviewId={review.id}
              initialHidden={Boolean(review.hiddenAt)}
              initialReason={review.hiddenReason ?? ""}
            />
          </article>
        ))}
      </section>

      {reviews.length === 0 && (
        <p className="disclaimer">هنوز نظری ثبت نشده است.</p>
      )}
    </main>
  );
}
