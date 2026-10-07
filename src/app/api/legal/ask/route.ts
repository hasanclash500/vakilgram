import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { answerLegalQuestion } from "@/modules/legal-qa/service";

const requestSchema = z.object({
  question: z.string().trim().min(3).max(2000),
  mode: z.enum(["simple", "expert"]).default("simple"),
  city: z.string().trim().max(100).optional()
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const answer = await answerLegalQuestion(
      getPrisma(),
      input.question,
      input.mode,
      input.city
    );

    return NextResponse.json(answer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "ورودی نامعتبر است.", details: error.issues },
        { status: 400 }
      );
    }

    console.error("legal-answer-failed", {
      message: error instanceof Error ? error.message : "unknown"
    });

    return NextResponse.json(
      { error: "در حال حاضر امکان تولید پاسخ مستند وجود ندارد." },
      { status: 503 }
    );
  }
}
