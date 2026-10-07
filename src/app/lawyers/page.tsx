import Link from "next/link";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function LawyersPage({
  searchParams
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const params = await searchParams;
  const city = params.city?.trim();

  const lawyers = await getPrisma().lawyer.findMany({
    where: {
      active: true,
      verified: true,
      ...(city ? { city } : {})
    },
    include: {
      specialties: {
        select: { area: true }
      }
    },
    orderBy: {
      fullName: "asc"
    },
    take: 50
  });

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
        {lawyers.map((lawyer) => (
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
            {lawyer.specialties.length > 0 && (
              <small>
                {lawyer.specialties
                  .map((item) => item.area)
                  .join(" · ")}
              </small>
            )}
          </Link>
        ))}
      </section>

      {lawyers.length === 0 && (
        <p className="disclaimer">
          وکیل تأییدشده‌ای با این فیلتر پیدا نشد.
        </p>
      )}
    </main>
  );
}
