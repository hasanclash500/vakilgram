import Link from "next/link";
import { redirect } from "next/navigation";
import { WalletAdjustmentForm } from "../components/wallet-adjustment-form";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";
import { featureEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function AdminWalletsPage() {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/api/auth/signin?callbackUrl=/admin/wallets");
  }

  const enabled = featureEnabled("WALLET");
  const lawyers = await getPrisma().lawyer.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      fullName: true,
      verified: true,
      active: true,
      wallet: {
        select: {
          balance: true,
          entries: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              type: true,
              amount: true,
              balanceAfter: true,
              description: true,
              createdAt: true
            }
          }
        }
      }
    }
  });

  return (
    <main className="shell">
      <p><Link href="/admin">بازگشت به داشبورد</Link></p>

      <header className="hero">
        <span className="eyebrow">درآمد · فاز ۲</span>
        <h1>کیف پول وکلا</h1>
        <p>
          درگاه پرداخت هنوز جزو فاز ۳ است؛ در فاز ۲ شارژ و اصلاح موجودی
          توسط ادمین ثبت می‌شود و کلیک ویژه به‌صورت خودکار از موجودی کم
          می‌کند.
        </p>
      </header>

      {!enabled && (
        <p className="law-warning">
          FEATURE_WALLET غیرفعال است و کسر خودکار انجام نمی‌شود.
        </p>
      )}

      <div className="admin-stack">
        {lawyers.map((lawyer) => (
          <section className="assistant-card" key={lawyer.id}>
            <h2>{lawyer.fullName}</h2>
            <p className="disclaimer">
              {lawyer.verified ? "تأییدشده" : "تأییدنشده"} ·{" "}
              {lawyer.active ? "فعال" : "غیرفعال"}
            </p>

            <WalletAdjustmentForm
              lawyerId={lawyer.id}
              initialBalance={(lawyer.wallet?.balance ?? 0n).toString()}
            />

            {lawyer.wallet?.entries.length ? (
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
                  {lawyer.wallet.entries.map((entry) => (
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
            ) : (
              <p className="disclaimer">هنوز تراکنشی ثبت نشده است.</p>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
