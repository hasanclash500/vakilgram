import type { z } from "zod";

export type LlmRole = "system" | "user" | "assistant";

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmRequest {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LlmProvider {
  readonly name: string;
  generate(input: LlmRequest): Promise<string>;
  generateJson<T>(input: LlmRequest, schema: z.ZodType<T>): Promise<T>;
}
