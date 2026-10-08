import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/user";
import { getPrisma } from "@/lib/db/prisma";
import { featureEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function ChatInboxPage() {
  if (!featureEnabled("CHAT")) {
    redirect("/");
  }

  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/api/auth/signin?callbackUrl=/chat");
  }

  const prisma = getPrisma();
  const linkedLawyer = await prisma.lawyer.findUnique({
    where: { userId: user.id },
    select: { id: true }
  });

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { userId: user.id },
        ...(linkedLawyer ? [{ lawyerId: linkedLawyer.id }] : [])
      ]
    },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      lawyer: {
        select: {
          id: true,
          fullName: true
        }
      },
      user: {
        select: {
          name: true,
          email: true
        }
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          content: true,
          role: true
        }
      }
    }
  });

  return (
    <main className="shell">
      <p><Link href="/">صفحه اصلی</Link></p>

      <header className="hero">
        <span className="eyebrow">تعامل · فاز ۲</span>
        <h1>گفتگوهای من</h1>
        <p>
          فقط گفتگوهایی نمایش داده می‌شوند که شما یکی از طرف‌های آن
          هستید.
        </p>
      </header>

      <section className="chat-inbox">
        {conversations.map((conversation) => {
          const asLawyer =
            linkedLawyer?.id === conversation.lawyerId;

          return (
            <Link
              className="law-list-item"
              href={"/chat/" + conversation.id}
              key={conversation.id}
            >
              <strong>
                {asLawyer
                  ? conversation.user?.name ??
                    conversation.user?.email ??
                    "کاربر"
                  : conversation.lawyer?.fullName ?? "وکیل"}
              </strong>
              <span>
                {conversation.status === "OPEN"
                  ? "باز"
                  : "بسته"}
              </span>
              <p>
                {conversation.messages[0]?.content ??
                  "هنوز پیامی ارسال نشده است."}
              </p>
            </Link>
          );
        })}

        {conversations.length === 0 && (
          <p className="disclaimer">
            هنوز گفتگویی برای این حساب وجود ندارد.
          </p>
        )}
      </section>
    </main>
  );
}
