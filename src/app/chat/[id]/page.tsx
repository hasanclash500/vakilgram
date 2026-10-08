import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChatThread } from "@/app/components/chat-thread";
import { getPrisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/user";
import { featureEnabled } from "@/lib/features";
import {
  ChatError,
  getConversationForParticipant
} from "@/modules/chat/service";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  if (!featureEnabled("CHAT")) redirect("/");

  let user;
  try {
    user = await requireUser();
  } catch {
    const { id } = await params;
    redirect(
      "/api/auth/signin?callbackUrl=" +
        encodeURIComponent("/chat/" + id)
    );
  }

  const { id } = await params;
  const prisma = getPrisma();

  let access;
  try {
    access = await getConversationForParticipant(
      prisma,
      id,
      user.id
    );
  } catch (error) {
    if (error instanceof ChatError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    take: 500,
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true
    }
  });

  const counterpart =
    access.participantRole === "LAWYER"
      ? "کاربر"
      : access.conversation.lawyer?.fullName ?? "وکیل";

  return (
    <main className="shell">
      <p><Link href="/chat">بازگشت به گفتگوها</Link></p>

      <header className="hero">
        <span className="eyebrow">چت متنی</span>
        <h1>گفتگو با {counterpart}</h1>
        <p>
          پیام‌های این Conversation با رضایت صریح شروع‌کننده ذخیره شده‌اند.
        </p>
      </header>

      <ChatThread
        conversationId={id}
        currentRole={access.participantRole}
        initialStatus={access.conversation.status}
        initialMessages={messages.map((message) => ({
          ...message,
          createdAt: message.createdAt.toISOString()
        }))}
      />
    </main>
  );
}
