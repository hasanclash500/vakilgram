import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import {
  hashVisitor,
  resolveVisitorId,
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE
} from "@/lib/privacy/visitor";
import { recordSponsoredClick } from "@/modules/ads/click-service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: lawyerId } = await context.params;
  const secret =
    process.env.VISITOR_HASH_SECRET ??
    process.env.CLICK_HASH_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "تنظیم امنیتی شمارش کلیک کامل نشده است." },
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
    "ad-click"
  );

  const result = await recordSponsoredClick(
    getPrisma(),
    lawyerId,
    visitorHash
  );

  if (result.status === "not-sponsored") {
    return NextResponse.json(
      { error: "تبلیغ فعال برای این وکیل پیدا نشد." },
      { status: 404 }
    );
  }

  const response = NextResponse.json({
    counted: result.counted
  });

  if (visitor.isNew) {
    response.cookies.set({
      name: VISITOR_COOKIE,
      value: visitor.visitorId,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: VISITOR_COOKIE_MAX_AGE,
      path: "/"
    });
  }

  return response;
}
