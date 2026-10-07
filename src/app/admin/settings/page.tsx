import Link from "next/link";
import { redirect } from "next/navigation";
import { RuntimeSettingsForm } from "../components/runtime-settings-form";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";
import { getRuntimeSettings } from "@/lib/settings/runtime-settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/api/auth/signin?callbackUrl=/admin/settings");
  }

  const settings = await getRuntimeSettings(getPrisma());

  return (
    <main className="shell">
      <p><Link href="/admin">بازگشت به داشبورد</Link></p>
      <header className="hero">
        <span className="eyebrow">تنظیمات</span>
        <h1>تنظیمات عمومی فاز ۱</h1>
        <p>
          کلیدهای API همچنان فقط در Environment نگهداری می‌شوند و از این
          صفحه قابل مشاهده نیستند.
        </p>
      </header>

      <RuntimeSettingsForm
        initialVoiceEnabled={settings.voiceEnabled}
        initialDisclaimer={settings.disclaimer}
      />
    </main>
  );
}
