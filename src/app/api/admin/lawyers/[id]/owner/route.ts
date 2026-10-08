import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";
import {
  LawyerOwnershipError,
  setLawyerOwner
} from "@/modules/lawyers/ownership-service";

const schema = z.object({
  email: z.string().trim().email().max(320).nullable()
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const prisma = getPrisma();

    const result = await setLawyerOwner(
      prisma,
      id,
      input.email
    );

    await writeAudit(prisma, {
      userId: admin.id,
      action: input.email
        ? "LAWYER_OWNER_LINK"
        : "LAWYER_OWNER_UNLINK",
      entityType: "LAWYER",
      entityId: id,
      details: {
        ownerEmail: result.ownerEmail
      }
    });

    return NextResponse.json({
      ok: true,
      ownerEmail: result.ownerEmail
    });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "ایمیل حساب کاربری نامعتبر است." },
        { status: 400 }
      );
    }

    if (error instanceof LawyerOwnershipError) {
      const messages: Record<string, string> = {
        LAWYER_NOT_FOUND: "پروفایل وکیل پیدا نشد.",
        USER_NOT_FOUND:
          "کاربری با این ایمیل وجود ندارد؛ کاربر باید ابتدا وارد وکیل‌گرام شده باشد.",
        USER_ALREADY_HAS_LAWYER:
          "این حساب قبلاً به پروفایل وکیل دیگری متصل است.",
        LAWYER_ALREADY_HAS_OWNER:
          "این پروفایل قبلاً به حساب دیگری متصل است؛ ابتدا اتصال قبلی را بردارید."
      };

      return NextResponse.json(
        { error: messages[error.code] ?? "اتصال حساب انجام نشد." },
        {
          status:
            error.code === "LAWYER_NOT_FOUND" ||
            error.code === "USER_NOT_FOUND"
              ? 404
              : 409
        }
      );
    }

    return NextResponse.json(
      { error: "اتصال حساب وکیل انجام نشد." },
      { status: 503 }
    );
  }
}
