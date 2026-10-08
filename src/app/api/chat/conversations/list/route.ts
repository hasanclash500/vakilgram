import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/user";
import { featureEnabled } from "@/lib/features";
import { chatErrorResponse } from "@/modules/chat/http";

export async function GET() {
  try {
    if (!featureEnabled("CHAT")) {
      return NextResponse.json(
        { error: "چت غیرفعال است." },
        { status: 404 }
      );
    }

    const user = await requireUser();
    const prisma = getPrisma();

    const linkedLawyer = await prisma.lawyer.findUnique({
      where: { userId: user.id },
      select: { id: true }
    });

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { userId: user.id },
          ...(linkedLawyer
            ? [{ lawyerId: linkedLawyer.id }]
            : [])
        ]
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      include: {
        lawyer: {
          select: {
            id: true,
            fullName: true,
            slug: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            content: true,
            role: true,
            createdAt: true
          }
        }
      }
    });

    return NextResponse.json({
      conversations: conversations.map((item) => ({
        id: item.id,
        status: item.status,
        lastMessageAt: item.lastMessageAt.toISOString(),
        lawyer: item.lawyer,
        client:
          linkedLawyer?.id === item.lawyerId
            ? {
                id: item.user?.id ?? null,
                name: item.user?.name ?? null,
                email: item.user?.email ?? null
              }
            : null,
        lastMessage: item.messages[0]
          ? {
              content: item.messages[0].content,
              role: item.messages[0].role,
              createdAt: item.messages[0].createdAt.toISOString()
            }
          : null
      }))
    });
  } catch (error) {
    const mapped = chatErrorResponse(error);
    if (mapped) return mapped;

    return NextResponse.json(
      { error: "دریافت فهرست چت‌ها انجام نشد." },
      { status: 503 }
    );
  }
}
