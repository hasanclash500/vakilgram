import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/api/auth/signin?callbackUrl=/admin/audit");

  const logs = await getPrisma().auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: {
        select: { email: true, name: true }
      }
    }
  });

  return (
    <main className="shell">
      <p><Link href="/admin">بازگشت به داشبورد</Link></p>
      <header className="hero">
        <span className="eyebrow">امنیت و ردیابی</span>
        <h1>Audit log</h1>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>زمان</th>
              <th>کاربر</th>
              <th>عملیات</th>
              <th>موجودیت</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.createdAt.toLocaleString("fa-IR")}</td>
                <td>{log.user?.email ?? log.user?.name ?? "سیستم"}</td>
                <td>{log.action}</td>
                <td>
                  {log.entityType}
                  {log.entityId ? " · " + log.entityId : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
