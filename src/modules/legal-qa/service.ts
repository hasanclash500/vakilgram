import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { normalizePersian } from "@/lib/text/normalize-persian";
import { getRuntimeSettings } from "@/lib/settings/runtime-settings";
import { recommendLawyers } from "@/modules/lawyers/recommend";
import type { LawyerRecommendationSet } from "@/modules/lawyers/types";
import { loadLlmRegistry } from "@/providers/llm/registry";
import {
  collectGroundedCitationIds,
  groundCitedTexts
} from "./citation-validator";
import { retrieveHybrid } from "./retrieval";
import type { AnswerMode, LegalAnswer } from "./types";

const citedTextSchema = z.object({
  text: z.string().trim().min(1),
  articleIds: z.array(z.string()).min(1).max(6)
});

const llmOutputSchema = z.object({
  summary: citedTextSchema,
  points: z.array(citedTextSchema).min(1).max(10),
  legalArea: z.string().nullable().default(null)
});

const EMPTY_LAWYERS: LawyerRecommendationSet = {
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
  const { disclaimer } = await getRuntimeSettings(prisma);

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
        `وضعیت قانون: ${article.lawStatus}`,
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
            "تو دستیار حقوقی مستند فارسی هستی. فقط از متن مواد داده‌شده استفاده کن. هر بند پاسخ و خلاصه باید articleIds خودش را داشته باشد و همه IDها باید دقیقاً از context باشند. هیچ قانون، ماده، رأی یا واقعیت حقوقی خارج از context نساز. اگر وضعیت قانون UNKNOWN یا REPEALED است، با قطعیت آن را قانون جاری معرفی نکن. خروجی فقط JSON معتبر باشد."
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
            'JSON: {"summary":{"text":"...","articleIds":["..."]},"points":[{"text":"...","articleIds":["..."]}],"legalArea":"..."}'
          ].join("\n")
        }
      ]
    },
    llmOutputSchema
  );

  const allowedIds = articles.map((article) => article.id);
  const groundedPoints = groundCitedTexts(result.points, allowedIds);
  if (groundedPoints.length === 0) {
    return noSourceAnswer(disclaimer);
  }

  const groundedSummary = groundCitedTexts(
    [result.summary],
    allowedIds
  )[0];

  const allGrounded = groundedSummary
    ? [groundedSummary, ...groundedPoints]
    : groundedPoints;

  const citationIds = collectGroundedCitationIds(allGrounded);
  if (citationIds.length === 0) {
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

  const answer = groundedPoints
    .map((point) => point.text)
    .join("\n\n");

  const summary =
    groundedSummary?.text ??
    (answer.length > 180 ? answer.slice(0, 177) + "..." : answer);

  return {
    answer,
    summary,
    legalArea: result.legalArea,
    lawyers,
    disclaimer,
    documented: true,
    sources: citationIds.flatMap((id) => {
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
