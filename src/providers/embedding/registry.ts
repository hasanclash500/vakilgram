import type { PrismaClient } from "@/generated/prisma/client";
import { OpenAiCompatibleEmbeddingProvider } from "./openai-compatible";
import type { EmbeddingProvider } from "./types";

export async function loadEmbeddingProviders(
  prisma: PrismaClient
): Promise<EmbeddingProvider[]> {
  const configs = await prisma.aiProviderConfig.findMany({
    where: { kind: "EMBEDDING", enabled: true },
    orderBy: { position: "asc" }
  });

  const providers: EmbeddingProvider[] = [];

  for (const config of configs) {
    const apiKey = config.apiKeyEnv
      ? process.env[config.apiKeyEnv]
      : undefined;

    if (config.apiKeyEnv && !apiKey) continue;

    providers.push(
      new OpenAiCompatibleEmbeddingProvider({
        name: config.name,
        baseUrl: config.baseUrl,
        model: config.model,
        apiKey,
        timeoutMs: config.timeoutMs
      })
    );
  }

  return providers;
}
