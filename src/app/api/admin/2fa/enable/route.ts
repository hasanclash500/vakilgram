import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAccessError } from "@/lib/auth/api";
import { requirePrimaryAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";
import { consumeAdminTwoFactorRateLimit } from "@/modules/auth/admin-2fa-rate-limit";
import { enableAdminTwoFactor } from "@/modules/auth/admin-2fa";

const schema = z.object({
  code: z.string().trim().regex(/^\d{6}$/)
});

export async function POST(request: Request) {
  try {
    const admin = await requirePrimaryAdminUser();
    const input = schema.parse(await request.json());
    const prisma = getPrisma();
    const rateLimit = await consumeAdminTwoFactorRateLimit(
      prisma,
      admin.id
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "تعداد تلاش‌های 2FA زیاد است. پس از پایان این بازه دوباره تلاش کنید."
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
    }

    const enabled = await enableAdminTwoFactor(
      prisma,
      admin.id,
      input.code
    );

    if (!enabled) {
      return NextResponse.json(
        { error: "کد تأیید معتبر نیست." },
        { status: 400 }
      );
    }

    await writeAudit(prisma, {
      userId: admin.id,
      action: "ADMIN_2FA_ENABLE",
      entityType: "USER",
      entityId: admin.id
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "کد ۶ رقمی معتبر وارد کنید." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "فعال‌سازی 2FA انجام نشد." },
      { status: 503 }
    );
  }
}
