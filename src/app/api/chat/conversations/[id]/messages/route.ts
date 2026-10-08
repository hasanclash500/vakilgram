import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/user";
import { chatErrorResponse } from "@/modules/chat/http";
import {
  listConversationMessages,
  sendConversationMessage
} from "@/modules/chat/service";

const schema = z.object({
  content: z.string().trim().min(1).max(4000)
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    const messages = await listConversationMessages(
      getPrisma(),
      id,
      user.id
    );

    return NextResponse.json({
      messages: messages.map((message) => ({
        ...message,
        createdAt: message.createdAt.toISOString()
      }))
    });
  } catch (error) {
    const mapped = chatErrorResponse(error);
    if (mapped) return mapped;

    return NextResponse.json(
      { error: "دریافت پیام‌ها انجام نشد." },
      { status: 503 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const input = schema.parse(await request.json());

    const message = await sendConversationMessage(
      getPrisma(),
      id,
      user.id,
      input.content
    );

    return NextResponse.json({
      ok: true,
      message: {
        ...message,
        createdAt: message.createdAt.toISOString()
      }
    });
  } catch (error) {
    const mapped = chatErrorResponse(error);
    if (mapped) return mapped;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "متن پیام نامعتبر است." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "ارسال پیام انجام نشد." },
      { status: 503 }
    );
  }
}
