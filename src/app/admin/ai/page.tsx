import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AiProviderEditor,
  type ProviderHealth
} from "../components/ai-provider-editor";
import { AiProviderCreateForm } from "../components/ai-provider-create-form";
import { getAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  const admin = await getAdminUser();
  if (!admin) redirect("/api/auth/signin?callbackUrl=/admin/ai");

  const prisma = getPrisma();
  const [providers, recentUsage] = await Promise.all([
    prisma.aiProviderConfig.findMany({
      orderBy: [{ kind: "asc" }, { position: "asc" }]
    }),
    prisma.aiUsageLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        providerConfigId: true,
        success: true,
        latencyMs: true
      }
    })
  ]);

  const health = new Map<string, ProviderHealth>();

  for (const log of recentUsage) {
    if (!log.providerConfigId) continue;

    const current = health.get(log.providerConfigId) ?? {
      requests: 0,
      successes: 0,
      failures: 0,
      averageLatencyMs: null
    };

    const previousLatencyTotal =
      (current.averageLatencyMs ?? 0) * current.requests;

    current.requests += 1;
    current.successes += log.success ? 1 : 0;
    current.failures += log.success ? 0 : 1;
    current.averageLatencyMs =
      (previousLatencyTotal + log.latencyMs) / current.requests;

    health.set(log.providerConfigId, current);
  }

  return (
    <main className="shell">
      <p><Link href="/admin">بازگشت به داشبورد</Link></p>
      <header className="hero">
        <span className="eyebrow">تنظیمات AI</span>
        <h1>Provider و Fallback</h1>
        <p>
          کلید API در دیتابیس ذخیره نمی‌شود؛ فقط نام متغیر محیطی کلید
          نگهداری می‌شود. آمار پایین متن سؤال یا پاسخ را ذخیره نمی‌کند.
        </p>
      </header>

      <div className="admin-stack">
        <AiProviderCreateForm />

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
              health={health.get(provider.id)}
            />
          ))}
        </section>
      </div>
    </main>
  );
}
