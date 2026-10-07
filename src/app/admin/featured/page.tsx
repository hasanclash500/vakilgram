import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FeaturedAssignmentForm,
  FeaturedSubscriptionToggle
} from "../components/featured-assignment-form";
import { FeaturedTierManager } from "../components/featured-tier-manager";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminFeaturedPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/api/auth/signin?callbackUrl=/admin/featured");

  const prisma = getPrisma();
  const [lawyers, tiers, subscriptions] = await Promise.all([
    prisma.lawyer.findMany({
      where: { active: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true }
    }),
    prisma.featuredTier.findMany({
      orderBy: { priority: "desc" }
    }),
    prisma.lawyerFeaturedSubscription.findMany({
      orderBy: { startsAt: "desc" },
      take: 50,
      include: {
        lawyer: { select: { fullName: true } },
        tier: { select: { name: true } }
      }
    })
  ]);

  const activeTiers = tiers.filter((tier) => tier.active);

  return (
    <main className="shell">
      <p><Link href="/admin">بازگشت به داشبورد</Link></p>
      <header className="hero">
        <span className="eyebrow">مدیریت تبلیغات</span>
        <h1>سطح ویژه</h1>
        <p>
          تبلیغ فقط در پیشنهاد وکیل اثر می‌گذارد و نباید ترتیب منابع یا
          محتوای پاسخ حقوقی را تغییر دهد.
        </p>
      </header>

      <div className="admin-stack">
        <FeaturedTierManager
          initialTiers={tiers.map((tier) => ({
            id: tier.id,
            name: tier.name,
            priority: tier.priority,
            costPerClick: tier.costPerClick.toString(),
            active: tier.active
          }))}
        />

        <FeaturedAssignmentForm
          lawyers={lawyers.map((item) => ({
            id: item.id,
            label: item.fullName
          }))}
          tiers={activeTiers.map((item) => ({
            id: item.id,
            label: item.name
          }))}
        />

        <section className="admin-table-wrap">
          <h2>اشتراک‌های اخیر</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>وکیل</th>
                <th>سطح</th>
                <th>شروع</th>
                <th>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((item) => (
                <tr key={item.id}>
                  <td>{item.lawyer.fullName}</td>
                  <td>{item.tier.name}</td>
                  <td>{item.startsAt.toLocaleDateString("fa-IR")}</td>
                  <td>
                    <FeaturedSubscriptionToggle
                      id={item.id}
                      initialActive={item.active}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
