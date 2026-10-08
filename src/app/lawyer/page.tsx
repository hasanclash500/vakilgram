import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LawyerSelfProfileForm,
  type LawyerSelfFormValue
} from "./components/profile-form";
import { getPrisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/user";
import { getLawyerReviewSummary } from "@/modules/reviews/service";
import { featureEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

const EMPTY: LawyerSelfFormValue = {
  fullName: "",
  slug: "",
  licenseNumber: "",
  city: "",
  province: "",
  bio: "",
  avatarUrl: "",
  specialtiesText: "",
  socialLinksText: ""
};

export default async function LawyerDashboardPage() {
  let user;

  try {
    user = await requireUser();
  } catch {
    redirect("/api/auth/signin?callbackUrl=/lawyer");
  }

  const prisma = getPrisma();

  const lawyer = await prisma.lawyer.findUnique({
    where: { userId: user.id },
    include: {
      specialties: {
        select: { area: true }
      },
      socialLinks: {
        select: {
          platform: true,
          url: true
        }
      },
      wallet: {
        include: {
          entries: {
            orderBy: { createdAt: "desc" },
            take: 20
          }
        }
      },
      featured: {
        where: {
          active: true,
          startsAt: { lte: new Date() },
          OR: [
            { endsAt: null },
            { endsAt: { gte: new Date() } }
          ]
        },
        include: {
          tier: true
        }
      }
    }
  });

  if (!lawyer) {
    return (
      <main className="shell">
        <p><Link href="/">صفحه اصلی</Link></p>

        <header className="hero">
          <span className="eyebrow">پنل وکیل · فاز ۲</span>
          <h1>ثبت پروفایل وکیل</h1>
          <p>
            پروفایل به همین حساب متصل می‌شود و تا بررسی دستی شماره پروانه
            توسط ادمین نشان «تأییدشده» دریافت نمی‌کند.
          </p>
        </header>

        <LawyerSelfProfileForm
          initial={EMPTY}
          exists={false}
        />
      </main>
    );
  }

  const [reviewSummary, clickStats, openChats] =
    await Promise.all([
      featureEnabled("REVIEWS")
        ? getLawyerReviewSummary(prisma, lawyer.id)
        : Promise.resolve({
            count: 0,
            average: null,
            bayesian: null,
            priorAverage: 3
          }),
      prisma.adClick.aggregate({
        where: { lawyerId: lawyer.id },
        _count: { id: true },
        _sum: { chargedAmount: true }
      }),
      featureEnabled("CHAT")
        ? prisma.conversation.count({
            where: {
              lawyerId: lawyer.id,
              status: "OPEN"
            }
          })
        : Promise.resolve(0)
    ]);

  const initial: LawyerSelfFormValue = {
    fullName: lawyer.fullName,
    slug: lawyer.slug,
    licenseNumber: lawyer.licenseNumber ?? "",
    city: lawyer.city,
    province: lawyer.province ?? "",
    bio: lawyer.bio ?? "",
    avatarUrl: lawyer.avatarUrl ?? "",
    specialtiesText: lawyer.specialties
      .map((item) => item.area)
      .join(", "),
    socialLinksText: lawyer.socialLinks
      .map((item) => item.platform + "|" + item.url)
      .join("\n")
  };

  const activeTier = lawyer.featured
    .map((item) => item.tier)
    .sort((a, b) => b.priority - a.priority)[0];

  return (
    <main className="shell">
      <p><Link href="/">صفحه اصلی</Link></p>

      <header className="hero">
        <span className="eyebrow">پنل وکیل · فاز ۲</span>
        <h1>{lawyer.fullName}</h1>
        <p>
          {lawyer.verified
            ? "پروانه توسط ادمین تأیید شده است."
            : "پروفایل در انتظار تأیید دستی پروانه است."}
        </p>
        <nav className="hero-links">
          {lawyer.verified && lawyer.active && (
            <Link href={"/lawyers/" + lawyer.slug}>
              پروفایل عمومی
            </Link>
          )}
          {featureEnabled("CHAT") && (
            <Link href="/chat">
              گفتگوها ({openChats} باز)
            </Link>
          )}
        </nav>
      </header>

      <section className="admin-grid">
        <article className="admin-card">
          <strong>وضعیت</strong>
          <b>{lawyer.verified ? "تأییدشده" : "در انتظار"}</b>
          <small>{lawyer.active ? "فعال" : "غیرفعال"}</small>
        </article>

        <article className="admin-card">
          <strong>کیف پول</strong>
          <b>{(lawyer.wallet?.balance ?? 0n).toString()}</b>
          <small>
            {featureEnabled("WALLET")
              ? "کسر خودکار CPC فعال"
              : "Wallet غیرفعال"}
          </small>
        </article>

        <article className="admin-card">
          <strong>کلیک تبلیغاتی</strong>
          <b>{clickStats._count.id}</b>
          <small>
            کسر کل: {(clickStats._sum.chargedAmount ?? 0n).toString()}
          </small>
        </article>

        <article className="admin-card">
          <strong>امتیاز</strong>
          <b>
            {reviewSummary.bayesian !== null
              ? reviewSummary.bayesian + " / 5"
              : "—"}
          </b>
          <small>{reviewSummary.count} نظر قابل نمایش</small>
        </article>
      </section>

      <div className="admin-stack">
        <section className="assistant-card">
          <h2>جایگاه ویژه</h2>
          {activeTier ? (
            <>
              <p>
                سطح فعلی: <strong>{activeTier.name}</strong>
              </p>
              <p>
                هزینه هر کلیک:{" "}
                <strong>{activeTier.costPerClick.toString()}</strong>
              </p>
            </>
          ) : (
            <p className="disclaimer">
              اشتراک ویژه فعالی ندارید.
            </p>
          )}
        </section>

        <LawyerSelfProfileForm
          initial={initial}
          exists={true}
        />

        <section className="admin-table-wrap">
          <h2>آخرین تراکنش‌های کیف پول</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>نوع</th>
                <th>مبلغ</th>
                <th>موجودی بعد</th>
                <th>توضیح</th>
                <th>زمان</th>
              </tr>
            </thead>
            <tbody>
              {(lawyer.wallet?.entries ?? []).map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.type}</td>
                  <td>{entry.amount.toString()}</td>
                  <td>{entry.balanceAfter?.toString() ?? "—"}</td>
                  <td>{entry.description ?? "—"}</td>
                  <td>{entry.createdAt.toLocaleString("fa-IR")}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!lawyer.wallet?.entries.length && (
            <p className="disclaimer">
              هنوز تراکنشی ثبت نشده است.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
