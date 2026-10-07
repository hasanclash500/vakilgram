import { z } from "zod";
import type {
  LawDocumentInput,
  LawSourceAdapter
} from "./types";

const articleSchema = z.object({
  number: z.string().trim().min(1),
  title: z.string().trim().nullable().optional(),
  text: z.string().trim().min(1),
  sourceUrl: z.string().url().nullable().optional()
});

const lawSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  sourceUrl: z.string().url().nullable().optional(),
  enactedAt: z.string().datetime().nullable().optional(),
  effectiveAt: z.string().datetime().nullable().optional(),
  articles: z.array(articleSchema).min(1),
  metadata: z.record(z.string(), z.unknown()).optional()
});

const payloadSchema = z.union([
  lawSchema,
  z.array(lawSchema).min(1)
]);

export class JsonLawAdapter
  implements LawSourceAdapter<string | unknown>
{
  readonly name = "json";

  async parse(input: string | unknown): Promise<LawDocumentInput[]> {
    const parsed =
      typeof input === "string" ? JSON.parse(input) : input;

    const validated = payloadSchema.parse(parsed);
    return Array.isArray(validated) ? validated : [validated];
  }
}
