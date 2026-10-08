import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAccessError } from "@/lib/auth/api";
import { requirePrimaryAdminUser } from "@/lib/auth/admin";
import { getPrisma } from "@/lib/db/prisma";
import { verifyAdminSecondFactor } from "@/modules/auth/admin-2fa";

const schema = z.object({
  code: z.string().trim().min(6).max(32)
});

export async function POST(request: Request) {
  try {
    const admin = await requirePrimaryAdminUser();
    const input = schema.parse(await request.json());

    const verified = await verifyAdminSecondFactor(
      getPrisma(),
      admin.id,
      input.code
    );

    if (!verified) {
      return NextResponse.json(
        { error: "کد 2FA یا recovery code معتبر نیست." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "کد واردشده نامعتبر است." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "تأیید عامل دوم انجام نشد." },
      { status: 503 }
    );
  }
}
