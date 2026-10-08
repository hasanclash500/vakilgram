import { redirect } from "next/navigation";
import { AdminTwoFactorChallenge } from "@/app/components/admin-2fa-challenge";
import { getPrimaryAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";
import {
  adminTwoFactorEnabled,
  isAdminTwoFactorSatisfied
} from "@/modules/auth/admin-2fa";

export const dynamic = "force-dynamic";

function safeCallback(value: string | undefined) {
  if (!value || !value.startsWith("/admin")) return "/admin";
  if (value.startsWith("//")) return "/admin";
  return value;
}

export default async function AdminTwoFactorPage({
  searchParams
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const admin = await getPrimaryAdminUser();

  if (!admin) {
    redirect("/api/auth/signin?callbackUrl=/admin");
  }

  const prisma = getPrisma();
  const enabled = await adminTwoFactorEnabled(
    prisma,
    admin.id
  );

  if (!enabled) {
    redirect("/admin/security");
  }

  if (await isAdminTwoFactorSatisfied(prisma, admin.id)) {
    redirect("/admin");
  }

  const params = await searchParams;

  return (
    <main className="shell">
      <header className="hero">
        <span className="eyebrow">امنیت ادمین</span>
        <h1>عامل دوم را وارد کنید</h1>
        <p>
          کد ۶ رقمی TOTP یا یکی از Recovery Codeهای استفاده‌نشده را وارد
          کنید.
        </p>
      </header>

      <AdminTwoFactorChallenge
        callbackUrl={safeCallback(params.callbackUrl)}
      />
    </main>
  );
}
