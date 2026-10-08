import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminTwoFactorSetup } from "../components/admin-2fa-setup";
import { getPrimaryAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const admin = await getPrimaryAdminUser();

  if (!admin) {
    redirect("/api/auth/signin?callbackUrl=/admin/security");
  }

  const record = await getPrisma().adminTwoFactor.findUnique({
    where: { userId: admin.id },
    select: { enabled: true }
  });

  return (
    <main className="shell">
      <p><Link href="/admin">بازگشت به داشبورد</Link></p>

      <header className="hero">
        <span className="eyebrow">امنیت ادمین · فاز ۲</span>
        <h1>تأیید دومرحله‌ای</h1>
        <p>
          TOTP بدون وابستگی به SMS یا سرویس پولی اجرا می‌شود. Secret در
          دیتابیس به‌صورت AES-256-GCM رمز شده نگهداری می‌شود.
        </p>
      </header>

      <AdminTwoFactorSetup
        initialEnabled={Boolean(record?.enabled)}
      />
    </main>
  );
}
