import type { PrismaClient } from "@/generated/prisma/client";
import { featureEnabled } from "@/lib/features";

export class ChatError extends Error {
  constructor(
    public readonly status: 400 | 403 | 404 | 409,
    message: string
  ) {
    super(message);
    this.name = "ChatError";
  }
}

function requireChatEnabled() {
  if (!featureEnabled("CHAT")) {
    throw new ChatError(404, "Chat feature is disabled");
  }
}

export async function createLawyerConversation(
  prisma: PrismaClient,
  userId: string,
  lawyerId: string,
  consentToStore: boolean
) {
  requireChatEnabled();

  if (!consentToStore) {
    throw new ChatError(
      400,
      "Explicit storage consent is required"
    );
  }

  const lawyer = await prisma.lawyer.findFirst({
    where: {
      id: lawyerId,
      active: true,
      verified: true,
      userId: { not: null }
    },
    select: {
      id: true,
      userId: true,
      fullName: true
    }
  });

  if (!lawyer?.userId) {
    throw new ChatError(
      404,
      "Lawyer is not available for chat"
    );
  }

  if (lawyer.userId === userId) {
    throw new ChatError(
      400,
      "A lawyer cannot start a client chat with self"
    );
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      userId,
      lawyerId,
      status: "OPEN"
    },
    orderBy: { updatedAt: "desc" }
  });

  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      userId,
      lawyerId,
      consentToStore: true,
      status: "OPEN"
    }
  });
}

export async function getConversationForParticipant(
  prisma: PrismaClient,
  conversationId: string,
  userId: string
) {
  requireChatEnabled();

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      lawyer: {
        select: {
          id: true,
          userId: true,
          fullName: true,
          slug: true
        }
      }
    }
  });

  if (!conversation || !conversation.lawyer) {
    throw new ChatError(404, "Conversation not found");
  }

  const isClient = conversation.userId === userId;
  const isLawyer = conversation.lawyer.userId === userId;

  if (!isClient && !isLawyer) {
    throw new ChatError(403, "Conversation access denied");
  }

  return {
    conversation,
    participantRole: isLawyer ? "LAWYER" : "USER"
  } as const;
}

export async function listConversationMessages(
  prisma: PrismaClient,
  conversationId: string,
  userId: string
) {
  await getConversationForParticipant(
    prisma,
    conversationId,
    userId
  );

  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 500,
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true
    }
  });
}

export async function sendConversationMessage(
  prisma: PrismaClient,
  conversationId: string,
  userId: string,
  content: string
) {
  requireChatEnabled();

  const clean = content.trim();

  if (clean.length < 1 || clean.length > 4000) {
    throw new ChatError(400, "Message length is invalid");
  }

  return prisma.$transaction(async (tx) => {
    const access = await getConversationForParticipant(
      tx as unknown as PrismaClient,
      conversationId,
      userId
    );

    if (access.conversation.status !== "OPEN") {
      throw new ChatError(409, "Conversation is closed");
    }

    if (!access.conversation.consentToStore) {
      throw new ChatError(
        409,
        "Conversation storage consent is missing"
      );
    }

    const message = await tx.message.create({
      data: {
        conversationId,
        role: access.participantRole,
        content: clean
      },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true
      }
    });

    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: message.createdAt
      }
    });

    return message;
  });
}

export async function closeConversation(
  prisma: PrismaClient,
  conversationId: string,
  userId: string
) {
  const access = await getConversationForParticipant(
    prisma,
    conversationId,
    userId
  );

  if (access.conversation.status === "CLOSED") {
    return access.conversation;
  }

  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status: "CLOSED",
      closedAt: new Date()
    }
  });
}
