import type { z } from "zod";
import type { LlmProvider, LlmRequest } from "./types";

export interface OpenAiCompatibleConfig {
  name: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name: string;

  constructor(private readonly config: OpenAiCompatibleConfig) {
    this.name = config.name;
  }

  async generate(input: LlmRequest): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs ?? 15000
    );

    try {
      const response = await fetch(
        `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(this.config.apiKey
              ? { authorization: `Bearer ${this.config.apiKey}` }
              : {})
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: input.messages,
            temperature: input.temperature ?? 0.1,
            max_tokens: input.maxTokens ?? 1200
          }),
          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new Error(`${this.name}: HTTP ${response.status}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error(`${this.name}: empty response`);
      }

      return content;
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateJson<T>(
    input: LlmRequest,
    schema: z.ZodType<T>
  ): Promise<T> {
    const raw = await this.generate(input);
    const cleaned = raw
      .replace(/^\s*```(?:json)?/i, "")
      .replace(/```\s*$/, "")
      .trim();

    return schema.parse(JSON.parse(cleaned));
  }
}
