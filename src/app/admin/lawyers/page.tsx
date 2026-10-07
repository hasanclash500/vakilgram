import Link from "next/link";
import { redirect } from "next/navigation";
import { LawyerStatusEditor } from "../components/lawyer-status-editor";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminLawyersPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/api/auth/signin?callbackUrl=/admin/lawyers");

  const lawyers = await getPrisma().lawyer.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      specialties: { select: { area: true } }
    }
  });

  return (
    <main className="shell">
      <p><Link href="/admin">بازگشت به داشبورد</Link></p>
      <header className="hero">
        <span className="eyebrow">مدیریت وکلا</span>
        <h1>تأیید و وضعیت پروفایل</h1>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>نام</th>
              <th>شهر</th>
              <th>تخصص</th>
              <th>وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {lawyers.map((lawyer) => (
              <tr key={lawyer.id}>
                <td>
                  <Link href={"/lawyers/" + lawyer.slug}>
                    {lawyer.fullName}
                  </Link>
                </td>
                <td>{lawyer.city}</td>
                <td>
                  {lawyer.specialties.map((item) => item.area).join("، ")}
                </td>
                <td>
                  <LawyerStatusEditor
                    id={lawyer.id}
                    initialVerified={lawyer.verified}
                    initialActive={lawyer.active}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
