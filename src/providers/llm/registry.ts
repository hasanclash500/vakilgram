import type { PrismaClient } from "@/generated/prisma/client";
import { OpenAiCompatibleProvider } from "./openai-compatible";
import type { LlmProvider, LlmRequest } from "./types";
import type { z } from "zod";

export class LlmRegistry {
  constructor(private readonly providers: LlmProvider[]) {}

  async generateJson<T>(
    input: LlmRequest,
    schema: z.ZodType<T>
  ): Promise<T> {
    const errors: string[] = [];

    for (const provider of this.providers) {
      try {
        return await provider.generateJson(input, schema);
      } catch (error) {
        errors.push(
          `${provider.name}: ${
            error instanceof Error ? error.message : "unknown error"
          }`
        );
      }
    }

    throw new Error(`All LLM providers failed: ${errors.join(" | ")}`);
  }

  get size(): number {
    return this.providers.length;
  }
}

export async function loadLlmRegistry(
  prisma: PrismaClient
): Promise<LlmRegistry> {
  const configs = await prisma.aiProviderConfig.findMany({
    where: { kind: "LLM", enabled: true },
    orderBy: { position: "asc" }
  });

  const providers: LlmProvider[] = [];

  for (const config of configs) {
    const apiKey = config.apiKeyEnv
      ? process.env[config.apiKeyEnv]
      : undefined;

    if (config.apiKeyEnv && !apiKey) continue;

    providers.push(
      new OpenAiCompatibleProvider({
        name: config.name,
        baseUrl: config.baseUrl,
        model: config.model,
        apiKey,
        timeoutMs: config.timeoutMs
      })
    );
  }

  return new LlmRegistry(providers);
}
