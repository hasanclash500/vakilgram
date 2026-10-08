import { NextResponse } from "next/server";
import { adminAccessError } from "@/lib/auth/api";
import { requirePrimaryAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";
import { beginAdminTwoFactorSetup } from "@/modules/auth/admin-2fa";

export async function POST() {
  try {
    const admin = await requirePrimaryAdminUser();
    const prisma = getPrisma();

    const current = await prisma.adminTwoFactor.findUnique({
      where: { userId: admin.id },
      select: { enabled: true }
    });

    if (current?.enabled) {
      return NextResponse.json(
        { error: "تأیید دومرحله‌ای قبلاً فعال شده است." },
        { status: 409 }
      );
    }

    const setup = await beginAdminTwoFactorSetup(
      prisma,
      admin.id,
      admin.email ?? admin.name ?? admin.id
    );

    return NextResponse.json({
      ok: true,
      secret: setup.secret,
      otpAuthUri: setup.otpAuthUri,
      recoveryCodes: setup.recoveryCodes
    });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    return NextResponse.json(
      {
        error:
          "راه‌اندازی 2FA ممکن نیست؛ تنظیمات رمزنگاری سرور را بررسی کنید."
      },
      { status: 503 }
    );
  }
}
