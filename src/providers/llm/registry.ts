import type { PrismaClient } from "@/generated/prisma/client";
import { OpenAiCompatibleProvider } from "./openai-compatible";
import type { LlmProvider, LlmRequest } from "./types";
import type { z } from "zod";
import { providerErrorCode } from "@/providers/telemetry/error-code";

interface ProviderEntry {
  configId: string;
  provider: LlmProvider;
}

async function recordUsage(
  prisma: PrismaClient,
  input: {
    providerConfigId: string;
    success: boolean;
    latencyMs: number;
    errorCode?: string | null;
  }
): Promise<void> {
  try {
    await prisma.aiUsageLog.create({
      data: {
        providerConfigId: input.providerConfigId,
        kind: "LLM",
        success: input.success,
        latencyMs: input.latencyMs,
        errorCode: input.errorCode?.slice(0, 120) ?? null
      }
    });
  } catch {
    // Observability must never make the answer path fail.
  }
}

export class LlmRegistry {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly providers: ProviderEntry[]
  ) {}

  async generateJson<T>(
    input: LlmRequest,
    schema: z.ZodType<T>
  ): Promise<T> {
    const errors: string[] = [];

    for (const entry of this.providers) {
      const startedAt = Date.now();

      try {
        const result = await entry.provider.generateJson(input, schema);
        await recordUsage(this.prisma, {
          providerConfigId: entry.configId,
          success: true,
          latencyMs: Date.now() - startedAt
        });
        return result;
      } catch (error) {
        const errorCode = providerErrorCode(error);

        await recordUsage(this.prisma, {
          providerConfigId: entry.configId,
          success: false,
          latencyMs: Date.now() - startedAt,
          errorCode
        });

        errors.push(`${entry.provider.name}: ${errorCode}`);
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

  const providers: ProviderEntry[] = [];

  for (const config of configs) {
    const apiKey = config.apiKeyEnv
      ? process.env[config.apiKeyEnv]
      : undefined;

    if (config.apiKeyEnv && !apiKey) continue;

    providers.push({
      configId: config.id,
      provider: new OpenAiCompatibleProvider({
        name: config.name,
        baseUrl: config.baseUrl,
        model: config.model,
        apiKey,
        timeoutMs: config.timeoutMs
      })
    });
  }

  return new LlmRegistry(prisma, providers);
}
