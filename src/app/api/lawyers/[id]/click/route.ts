import { createHmac, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import { CLICK_DEDUPE_WINDOW_MS } from "@/modules/ads/click-dedupe";

const VISITOR_COOKIE = "vg_vid";

function hashVisitor(visitorId: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(visitorId)
    .digest("hex");
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: lawyerId } = await context.params;
  const secret = process.env.CLICK_HASH_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "تنظیم امنیتی شمارش کلیک کامل نشده است." },
      { status: 503 }
    );
  }

  const cookieStore = await cookies();
  const existingVisitor = cookieStore.get(VISITOR_COOKIE)?.value;
  const visitorId = existingVisitor ?? randomUUID();
  const visitorHash = hashVisitor(visitorId, secret);

  const prisma = getPrisma();
  const lawyer = await prisma.lawyer.findFirst({
    where: { id: lawyerId, active: true },
    select: { id: true }
  });

  if (!lawyer) {
    return NextResponse.json(
      { error: "وکیل موردنظر پیدا نشد." },
      { status: 404 }
    );
  }

  const cutoff = new Date(Date.now() - CLICK_DEDUPE_WINDOW_MS);

  const duplicate = await prisma.adClick.findFirst({
    where: {
      lawyerId,
      visitorHash,
      clickedAt: { gte: cutoff }
    },
    select: { id: true }
  });

  if (!duplicate) {
    await prisma.adClick.create({
      data: {
        lawyerId,
        visitorHash
      }
    });
  }

  const response = NextResponse.json({
    counted: !duplicate
  });

  if (!existingVisitor) {
    response.cookies.set({
      name: VISITOR_COOKIE,
      value: visitorId,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/"
    });
  }

  return response;
}
