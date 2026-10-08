import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { requireUser, UserAccessDeniedError } from "@/lib/auth/user";
import {
  createOwnLawyerProfile,
  selfLawyerProfileSchema,
  updateOwnLawyerProfile
} from "@/modules/lawyers/self-service";

function accessError(error: unknown) {
  if (!(error instanceof UserAccessDeniedError)) return null;

  return NextResponse.json(
    {
      error:
        error.status === 401
          ? "برای مدیریت پروفایل وکیل باید وارد شوید."
          : "دسترسی مجاز نیست."
    },
    { status: error.status }
  );
}

export async function GET() {
  try {
    const user = await requireUser();

    const lawyer = await getPrisma().lawyer.findUnique({
      where: { userId: user.id },
      include: {
        specialties: true,
        socialLinks: true
      }
    });

    return NextResponse.json({ lawyer });
  } catch (error) {
    const access = accessError(error);
    if (access) return access;

    return NextResponse.json(
      { error: "دریافت پروفایل انجام نشد." },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = selfLawyerProfileSchema.parse(await request.json());

    const lawyer = await createOwnLawyerProfile(
      getPrisma(),
      user.id,
      input
    );

    return NextResponse.json(
      { ok: true, lawyer },
      { status: 201 }
    );
  } catch (error) {
    const access = accessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "اطلاعات پروفایل وکیل نامعتبر است." },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "LAWYER_PROFILE_EXISTS"
    ) {
      return NextResponse.json(
        { error: "برای این حساب قبلاً پروفایل وکیل ساخته شده است." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error:
          "ساخت پروفایل انجام نشد؛ Slug یا شماره پروانه را بررسی کنید."
      },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const input = selfLawyerProfileSchema.parse(await request.json());

    const lawyer = await updateOwnLawyerProfile(
      getPrisma(),
      user.id,
      input
    );

    return NextResponse.json({ ok: true, lawyer });
  } catch (error) {
    const access = accessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "اطلاعات پروفایل وکیل نامعتبر است." },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "LAWYER_PROFILE_NOT_FOUND"
    ) {
      return NextResponse.json(
        { error: "پروفایل وکیل برای این حساب پیدا نشد." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error:
          "به‌روزرسانی انجام نشد؛ Slug یا شماره پروانه را بررسی کنید."
      },
      { status: 400 }
    );
  }
}
