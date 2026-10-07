import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ExistingLawyerEditor,
  NewLawyerForm
} from "../components/lawyer-profile-form";
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
      specialties: { select: { area: true } },
      socialLinks: { select: { platform: true, url: true } }
    }
  });

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

        <section>
          <h2>پروفایل‌های موجود</h2>
          <div className="admin-editor-grid">
            {lawyers.map((lawyer) => (
              <ExistingLawyerEditor
                key={lawyer.id}
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
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
