import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { normalizePersian } from "@/lib/text/normalize-persian";
import { recommendLawyers } from "@/modules/lawyers/recommend";
import { loadLlmRegistry } from "@/providers/llm/registry";
import { validateCitationIds } from "./citation-validator";
import { retrieveHybrid } from "./retrieval";
import type { AnswerMode, LegalAnswer } from "./types";

const llmOutputSchema = z.object({
  summary: z.string().min(1),
  answer: z.string().min(1),
  articleIds: z.array(z.string()).default([]),
  legalArea: z.string().nullable().default(null)
});

const DEFAULT_DISCLAIMER =
  "این پاسخ صرفاً اطلاعات عمومی حقوقی است و جایگزین مشاوره رسمی وکیل نیست.";

const EMPTY_LAWYERS = {
  featured: [],
  others: []
};

function noSourceAnswer(disclaimer: string): LegalAnswer {
  return {
    answer: "منبع مستند کافی برای پاسخ به این پرسش پیدا نشد.",
    summary: "منبع مستند پیدا نشد",
    legalArea: null,
    sources: [],
    lawyers: EMPTY_LAWYERS,
    disclaimer,
    documented: false
  };
}

export async function answerLegalQuestion(
  prisma: PrismaClient,
  question: string,
  mode: AnswerMode,
  city?: string | null
): Promise<LegalAnswer> {
  const normalizedQuestion = normalizePersian(question);
  const disclaimer = process.env.LEGAL_DISCLAIMER ?? DEFAULT_DISCLAIMER;

  const articles = await retrieveHybrid(prisma, normalizedQuestion, 12);
  if (articles.length === 0) {
    return noSourceAnswer(disclaimer);
  }

  const registry = await loadLlmRegistry(prisma);
  if (registry.size === 0) {
    return noSourceAnswer(disclaimer);
  }

  const context = articles
    .map((article) =>
      [
        `ID: ${article.id}`,
        `قانون: ${article.lawTitle}`,
        `ماده/شماره: ${article.number}`,
        `متن رسمی دیتابیس: ${article.text}`
      ].join("\n")
    )
    .join("\n\n---\n\n");

  const result = await registry.generateJson(
    {
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "تو دستیار حقوقی مستند فارسی هستی. فقط از متن مواد داده‌شده استفاده کن. هیچ قانون، ماده، رأی یا واقعیت حقوقی خارج از context نساز. خروجی فقط JSON معتبر باشد. articleIds فقط باید از IDهای داده‌شده انتخاب شوند."
        },
        {
          role: "user",
          content: [
            `حالت پاسخ: ${mode === "expert" ? "تخصصی" : "ساده"}`,
            `پرسش: ${normalizedQuestion}`,
            "",
            "مواد بازیابی‌شده:",
            context,
            "",
            'JSON: {"summary":"...","answer":"...","articleIds":["..."],"legalArea":"..."}'
          ].join("\n")
        }
      ]
    },
    llmOutputSchema
  );

  const validIds = validateCitationIds(
    result.articleIds,
    articles.map((article) => article.id)
  );

  if (validIds.length === 0) {
    return noSourceAnswer(disclaimer);
  }

  const byId = new Map(
    articles.map((article) => [article.id, article])
  );

  let lawyers = EMPTY_LAWYERS;
  try {
    lawyers = await recommendLawyers(
      prisma,
      result.legalArea,
      city
    );
  } catch {
    lawyers = EMPTY_LAWYERS;
  }

  return {
    answer: result.answer,
    summary: result.summary,
    legalArea: result.legalArea,
    lawyers,
    disclaimer,
    documented: true,
    sources: validIds.flatMap((id) => {
      const article = byId.get(id);
      if (!article) return [];

      return [{
        articleId: article.id,
        lawTitle: article.lawTitle,
        articleNumber: article.number,
        articleTitle: article.title,
        text: article.text,
        sourceUrl: article.sourceUrl
      }];
    })
  };
}
