import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/user";
import { chatErrorResponse } from "@/modules/chat/http";
import { closeConversation } from "@/modules/chat/service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    const conversation = await closeConversation(
      getPrisma(),
      id,
      user.id
    );

    return NextResponse.json({
      ok: true,
      status: conversation.status
    });
  } catch (error) {
    const mapped = chatErrorResponse(error);
    if (mapped) return mapped;

    return NextResponse.json(
      { error: "بستن چت انجام نشد." },
      { status: 503 }
    );
  }
}
