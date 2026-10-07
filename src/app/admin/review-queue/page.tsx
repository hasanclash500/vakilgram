import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/api/auth/signin?callbackUrl=/admin/review-queue");
  }

  const items = await getPrisma().reviewQueue.findMany({
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <main className="shell">
      <p><Link href="/admin">بازگشت به داشبورد</Link></p>
      <header className="hero">
        <span className="eyebrow">صف بازبینی</span>
        <h1>تغییرات نیازمند بررسی</h1>
        <p>
          فعال‌سازی کامل diff/approve در فاز ۲ انجام می‌شود؛ در فاز ۱
          تغییرات مواد نسخه‌بندی و در این صف ثبت می‌شوند.
        </p>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>زمان</th>
              <th>نوع</th>
              <th>موجودیت</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.createdAt.toLocaleString("fa-IR")}</td>
                <td>{item.kind}</td>
                <td>{item.entityId}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
