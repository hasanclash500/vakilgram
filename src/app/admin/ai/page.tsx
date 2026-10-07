import Link from "next/link";
import { redirect } from "next/navigation";
import { AiProviderEditor } from "../components/ai-provider-editor";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/api/auth/signin?callbackUrl=/admin/ai");

  const providers = await getPrisma().aiProviderConfig.findMany({
    orderBy: [{ kind: "asc" }, { position: "asc" }]
  });

  return (
    <main className="shell">
      <p><Link href="/admin">بازگشت به داشبورد</Link></p>
      <header className="hero">
        <span className="eyebrow">تنظیمات AI</span>
        <h1>Provider و Fallback</h1>
        <p>
          کلید API در دیتابیس ذخیره نمی‌شود؛ فقط نام متغیر محیطی کلید
          نگهداری می‌شود.
        </p>
      </header>

      <section className="admin-editor-grid">
        {providers.map((provider) => (
          <AiProviderEditor
            key={provider.id}
            provider={{
              id: provider.id,
              name: provider.name,
              kind: provider.kind,
              baseUrl: provider.baseUrl,
              model: provider.model,
              apiKeyEnv: provider.apiKeyEnv,
              position: provider.position,
              enabled: provider.enabled,
              timeoutMs: provider.timeoutMs
            }}
          />
        ))}
      </section>
    </main>
  );
}
