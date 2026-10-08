import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import {
  hashVisitor,
  resolveVisitorId,
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE
} from "@/lib/privacy/visitor";
import { consumeLegalAskRateLimit } from "@/lib/rate-limit/legal-ask";
import { answerLegalQuestion } from "@/modules/legal-qa/service";

const requestSchema = z.object({
  question: z.string().trim().min(3).max(2000),
  mode: z.enum(["simple", "expert"]).default("simple"),
  city: z.string().trim().max(100).optional()
});

const MAX_BODY_BYTES = 16 * 1024;

function setVisitorCookie(
  response: NextResponse,
  visitorId: string,
  isNew: boolean
) {
  if (!isNew) return;

  response.cookies.set({
    name: VISITOR_COOKIE,
    value: visitorId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: VISITOR_COOKIE_MAX_AGE,
    path: "/"
  });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "حجم درخواست بیش از حد مجاز است." },
        { status: 413 }
      );
    }

    const input = requestSchema.parse(JSON.parse(rawBody));
    const secret =
      process.env.VISITOR_HASH_SECRET ??
      process.env.CLICK_HASH_SECRET;

    if (!secret) {
      return NextResponse.json(
        { error: "تنظیم امنیتی سرویس کامل نشده است." },
        { status: 503 }
      );
    }

    const cookieStore = await cookies();
    const visitor = resolveVisitorId(
      cookieStore.get(VISITOR_COOKIE)?.value
    );
    const visitorHash = hashVisitor(
      visitor.visitorId,
      secret,
      "legal-ask"
    );

    const prisma = getPrisma();
    const rateLimit = await consumeLegalAskRateLimit(
      prisma,
      visitorHash
    );

    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        {
          error:
            "تعداد درخواست‌ها در این بازه زیاد است. کمی بعد دوباره تلاش کنید."
        },
        {
          status: 429,
          headers: {
            "retry-after": String(rateLimit.retryAfterSeconds),
            "x-ratelimit-limit": String(rateLimit.limit),
            "x-ratelimit-remaining": "0"
          }
        }
      );

      setVisitorCookie(
        response,
        visitor.visitorId,
        visitor.isNew
      );
      return response;
    }

    const answer = await answerLegalQuestion(
      prisma,
      input.question,
      input.mode,
      input.city
    );

    const response = NextResponse.json(answer, {
      headers: {
        "cache-control": "no-store",
        "x-ratelimit-limit": String(rateLimit.limit),
        "x-ratelimit-remaining": String(rateLimit.remaining)
      }
    });

    setVisitorCookie(
      response,
      visitor.visitorId,
      visitor.isNew
    );

    return response;
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "ورودی نامعتبر است." },
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
