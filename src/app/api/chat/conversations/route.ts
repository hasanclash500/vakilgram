import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/user";
import { chatErrorResponse } from "@/modules/chat/http";
import { createLawyerConversation } from "@/modules/chat/service";

const schema = z.object({
  lawyerId: z.string().min(1),
  consentToStore: z.literal(true)
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await request.json());

    const conversation = await createLawyerConversation(
      getPrisma(),
      user.id,
      input.lawyerId,
      input.consentToStore
    );

    return NextResponse.json({
      ok: true,
      conversationId: conversation.id
    });
  } catch (error) {
    const mapped = chatErrorResponse(error);
    if (mapped) return mapped;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error:
            "برای شروع چت باید رضایت صریح ذخیره پیام‌ها را تأیید کنید."
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "شروع چت انجام نشد." },
      { status: 503 }
    );
  }
}
