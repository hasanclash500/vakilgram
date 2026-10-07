import type { EmbeddingProvider } from "./types";

export interface OpenAiCompatibleEmbeddingConfig {
  name: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class OpenAiCompatibleEmbeddingProvider
  implements EmbeddingProvider
{
  readonly name: string;

  constructor(
    private readonly config: OpenAiCompatibleEmbeddingConfig
  ) {
    this.name = config.name;
  }

  async embed(text: string): Promise<number[]> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs ?? 15000
    );

    try {
      const response = await fetch(
        `${this.config.baseUrl.replace(/\/$/, "")}/embeddings`,
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
            input: text
          }),
          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new Error(`${this.name}: HTTP ${response.status}`);
      }

      const payload = (await response.json()) as {
        data?: Array<{ embedding?: number[] }>;
      };

      const embedding = payload.data?.[0]?.embedding;
      if (!embedding?.length) {
        throw new Error(`${this.name}: empty embedding`);
      }

      return embedding;
    } finally {
      clearTimeout(timeout);
    }
  }
}
