import type { PrismaClient } from "@/generated/prisma/client";
import { OpenAiCompatibleEmbeddingProvider } from "./openai-compatible";
import type { EmbeddingProvider } from "./types";

export interface ConfiguredEmbeddingProvider {
  configId: string;
  provider: EmbeddingProvider;
}

export async function loadConfiguredEmbeddingProviders(
  prisma: PrismaClient
): Promise<ConfiguredEmbeddingProvider[]> {
  const configs = await prisma.aiProviderConfig.findMany({
    where: { kind: "EMBEDDING", enabled: true },
    orderBy: { position: "asc" }
  });

  const providers: ConfiguredEmbeddingProvider[] = [];

  for (const config of configs) {
    const apiKey = config.apiKeyEnv
      ? process.env[config.apiKeyEnv]
      : undefined;

    if (config.apiKeyEnv && !apiKey) continue;

    providers.push({
      configId: config.id,
      provider: new OpenAiCompatibleEmbeddingProvider({
        name: config.name,
        baseUrl: config.baseUrl,
        model: config.model,
        apiKey,
        timeoutMs: config.timeoutMs
      })
    });
  }

  return providers;
}

export async function loadEmbeddingProviders(
  prisma: PrismaClient
): Promise<EmbeddingProvider[]> {
  return (await loadConfiguredEmbeddingProviders(prisma)).map(
    (item) => item.provider
  );
}
