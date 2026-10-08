import type { Prisma } from "@/generated/prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ExistingLawyerEditor,
  NewLawyerForm
} from "../components/lawyer-profile-form";
import { LawyerCsvImport } from "../components/lawyer-csv-import";
import { LawyerOwnerEditor } from "../components/lawyer-owner-editor";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type BooleanFilter = "all" | "yes" | "no";

function parsePage(value?: string): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseBooleanFilter(value?: string): BooleanFilter {
  return value === "yes" || value === "no" ? value : "all";
}

function pageHref(
  page: number,
  filters: {
    q: string;
    city: string;
    verified: BooleanFilter;
    active: BooleanFilter;
  }
) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.city) params.set("city", filters.city);
  if (filters.verified !== "all") {
    params.set("verified", filters.verified);
  }
  if (filters.active !== "all") {
    params.set("active", filters.active);
  }
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? "/admin/lawyers?" + query : "/admin/lawyers";
}

export default async function AdminLawyersPage({
  searchParams
}: {
  searchParams: Promise<{
    q?: string;
    city?: string;
    verified?: string;
    active?: string;
    page?: string;
  }>;
}) {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/api/auth/signin?callbackUrl=/admin/lawyers");
  }

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const city = params.city?.trim() ?? "";
  const verified = parseBooleanFilter(params.verified);
  const active = parseBooleanFilter(params.active);
  const requestedPage = parsePage(params.page);

  const where: Prisma.LawyerWhereInput = {
    ...(q
      ? {
          OR: [
            { fullName: { contains: q } },
            { slug: { contains: q } },
            { licenseNumber: { contains: q } }
          ]
        }
      : {}),
    ...(city
      ? {
          city: {
            contains: city
          }
        }
      : {}),
    ...(verified === "yes"
      ? { verified: true }
      : verified === "no"
        ? { verified: false }
        : {}),
    ...(active === "yes"
      ? { active: true }
      : active === "no"
        ? { active: false }
        : {})
  };

  const prisma = getPrisma();
  const total = await prisma.lawyer.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const lawyers = await prisma.lawyer.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      specialties: { select: { area: true } },
      socialLinks: { select: { platform: true, url: true } },
      user: { select: { email: true } }
    }
  });

  const filters = {
    q,
    city,
    verified,
    active
  };

  return (
    <main className="shell">
      <p><Link href="/admin">بازگشت به داشبورد</Link></p>

      <header className="hero">
        <span className="eyebrow">مدیریت وکلا</span>
        <h1>پروفایل، تخصص و تأیید</h1>
        <p>
          فقط پروفایل تأییدشده و فعال در دایرکتوری عمومی و پیشنهادهای پاسخ
          نمایش داده می‌شود.
        </p>
      </header>

      <div className="admin-stack">
        <NewLawyerForm />
        <LawyerCsvImport />

        <section className="assistant-card">
          <h2>جست‌وجو و فیلتر وکلا</h2>

          <form method="get">
            <div className="form-grid">
              <label>
                نام، Slug یا شماره پروانه
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="جست‌وجو..."
                />
              </label>

              <label>
                شهر
                <input
                  name="city"
                  defaultValue={city}
                  placeholder="مثلاً تهران"
                />
              </label>

              <label>
                تأیید
                <select name="verified" defaultValue={verified}>
                  <option value="all">همه</option>
                  <option value="yes">تأییدشده</option>
                  <option value="no">تأییدنشده</option>
                </select>
              </label>

              <label>
                وضعیت
                <select name="active" defaultValue={active}>
                  <option value="all">همه</option>
                  <option value="yes">فعال</option>
                  <option value="no">غیرفعال</option>
                </select>
              </label>
            </div>

            <div className="actions">
              <button type="submit">اعمال فیلتر</button>
              <Link href="/admin/lawyers">پاک‌کردن فیلترها</Link>
            </div>
          </form>
        </section>

        <section>
          <h2>پروفایل‌های موجود</h2>
          <p className="disclaimer">
            {total} رکورد · صفحه {page} از {totalPages}
          </p>

          <div className="admin-editor-grid">
            {lawyers.map((lawyer) => (
              <div className="admin-stack" key={lawyer.id}>
                <ExistingLawyerEditor
                  lawyer={{
                    id: lawyer.id,
                    fullName: lawyer.fullName,
                    slug: lawyer.slug,
                    licenseNumber: lawyer.licenseNumber ?? "",
                    city: lawyer.city,
                    province: lawyer.province ?? "",
                    bio: lawyer.bio ?? "",
                    avatarUrl: lawyer.avatarUrl ?? "",
                    verified: lawyer.verified,
                    active: lawyer.active,
                    specialtiesText: lawyer.specialties
                      .map((item) => item.area)
                      .join(", "),
                    socialLinksText: lawyer.socialLinks
                      .map((item) => item.platform + "|" + item.url)
                      .join("\n")
                  }}
                />
                <LawyerOwnerEditor
                  lawyerId={lawyer.id}
                  initialOwnerEmail={lawyer.user?.email ?? ""}
                />
              </div>
            ))}
          </div>

          {lawyers.length === 0 && (
            <p className="disclaimer">
              وکیلی با این فیلترها پیدا نشد.
            </p>
          )}

          <div className="actions">
            {page > 1 && (
              <Link href={pageHref(page - 1, filters)}>
                صفحه قبل
              </Link>
            )}
            {page < totalPages && (
              <Link href={pageHref(page + 1, filters)}>
                صفحه بعد
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
