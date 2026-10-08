import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { isHttpUrl } from "@/lib/url/http";

export type SourceAdapterFormat = "json" | "csv";

export interface SourceAdapterConfig {
  format: SourceAdapterFormat;
  updateUrl: string;
}

const schema = z.object({
  format: z.enum(["json", "csv"]),
  updateUrl: z
    .string()
    .url()
    .refine(isHttpUrl, "URL must use HTTP(S)")
});

function plainObject(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

export function readSourceAdapterConfig(
  value: Prisma.JsonValue | null
): SourceAdapterConfig | null {
  const root = plainObject(value);
  const result = schema.safeParse(root.phase2Adapter);

  return result.success ? result.data : null;
}

export function mergeSourceAdapterConfig(
  value: Prisma.JsonValue | null,
  input: {
    format: SourceAdapterFormat | null;
    updateUrl: string | null;
  }
): Prisma.InputJsonValue {
  const root = plainObject(value);

  if (!input.format || !input.updateUrl) {
    delete root.phase2Adapter;
    return root as Prisma.InputJsonValue;
  }

  root.phase2Adapter = schema.parse({
    format: input.format,
    updateUrl: input.updateUrl
  });

  return root as Prisma.InputJsonValue;
}
