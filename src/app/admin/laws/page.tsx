import type { Prisma } from "@/generated/prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";
import { LawImportForm } from "../components/law-import-form";
import { SourceManager } from "../components/source-manager";
import { LawReindexButton } from "../components/law-reindex-button";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const LAW_STATUSES = [
  "ACTIVE",
  "AMENDED",
  "REPEALED",
  "UNKNOWN"
] as const;

type LawStatusFilter = (typeof LAW_STATUSES)[number];

function parsePage(value?: string): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseStatus(value?: string): LawStatusFilter | undefined {
  return LAW_STATUSES.includes(value as LawStatusFilter)
    ? (value as LawStatusFilter)
    : undefined;
}

function pageHref(
  page: number,
  filters: {
    q: string;
    sourceId: string;
    status?: LawStatusFilter;
  }
) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.sourceId) params.set("sourceId", filters.sourceId);
  if (filters.status) params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? "/admin/laws?" + query : "/admin/laws";
}

export default async function AdminLawsPage({
  searchParams
}: {
  searchParams: Promise<{
    q?: string;
    sourceId?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/api/auth/signin?callbackUrl=/admin/laws");
  }

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const sourceId = params.sourceId?.trim() ?? "";
  const status = parseStatus(params.status);
  const requestedPage = parsePage(params.page);

  const prisma = getPrisma();

  const where: Prisma.LawWhereInput = {
    ...(q
      ? {
          title: {
            contains: q
          }
        }
      : {}),
    ...(sourceId ? { sourceId } : {}),
    ...(status ? { status } : {})
  };

  const [allSources, total] = await Promise.all([
    prisma.source.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        baseUrl: true,
        sourceType: true,
        official: true,
        enabled: true
      }
    }),
    prisma.law.count({ where })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const laws = await prisma.law.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      source: { select: { name: true } },
      _count: { select: { articles: true } }
    }
  });

  const importSources = allSources
    .filter((source) => source.official && source.enabled)
    .map((source) => ({ id: source.id, name: source.name }));

  const filters = { q, sourceId, status };

  return (
    <main className="shell">
      <p><Link href="/admin">بازگشت به داشبورد</Link></p>

      <header className="hero">
        <span className="eyebrow">مدیریت قوانین</span>
        <h1>پایگاه قوانین</h1>
      </header>

      <div className="admin-stack">
        <SourceManager initialSources={allSources} />
        <LawReindexButton />

        {importSources.length > 0 ? (
          <LawImportForm sources={importSources} />
        ) : (
          <section className="assistant-card">
            <strong>منبع رسمی فعالی تعریف نشده است.</strong>
            <p className="disclaimer">
              در بخش بالا یک منبع رسمی فعال ایجاد کنید.
            </p>
          </section>
        )}

        <section className="assistant-card">
          <h2>جست‌وجو و فیلتر قوانین</h2>

          <form method="get">
            <div className="form-grid">
              <label>
                عنوان قانون
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="بخشی از عنوان..."
                />
              </label>

              <label>
                منبع
                <select name="sourceId" defaultValue={sourceId}>
                  <option value="">همه منابع</option>
                  {allSources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                وضعیت
                <select name="status" defaultValue={status ?? ""}>
                  <option value="">همه وضعیت‌ها</option>
                  <option value="ACTIVE">جاری</option>
                  <option value="AMENDED">اصلاح‌شده</option>
                  <option value="REPEALED">منسوخ</option>
                  <option value="UNKNOWN">نامشخص</option>
                </select>
              </label>
            </div>

            <div className="actions">
              <button type="submit">اعمال فیلتر</button>
              <Link href="/admin/laws">پاک‌کردن فیلترها</Link>
            </div>
          </form>
        </section>

        <section className="admin-table-wrap">
          <h2>قوانین</h2>
          <p className="disclaimer">
            {total} رکورد · صفحه {page} از {totalPages}
          </p>

          <table className="admin-table">
            <thead>
              <tr>
                <th>عنوان</th>
                <th>منبع</th>
                <th>مواد</th>
                <th>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {laws.map((law) => (
                <tr key={law.id}>
                  <td>
                    <Link href={"/admin/laws/" + law.id}>
                      {law.title}
                    </Link>
                  </td>
                  <td>{law.source.name}</td>
                  <td>{law._count.articles}</td>
                  <td>{law.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {laws.length === 0 && (
            <p className="disclaimer">
              قانونی با این فیلترها پیدا نشد.
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
