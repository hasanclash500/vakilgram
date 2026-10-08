import { NextResponse } from "next/server";
import { UserAccessDeniedError } from "@/lib/auth/user";
import { ReviewError } from "./service";

export function reviewErrorResponse(
  error: unknown
): NextResponse | null {
  if (error instanceof UserAccessDeniedError) {
    return NextResponse.json(
      {
        error:
          error.status === 401
            ? "برای ثبت نظر باید وارد شوید."
            : "دسترسی لازم وجود ندارد."
      },
      { status: error.status }
    );
  }

  if (error instanceof ReviewError) {
    const message =
      error.status === 409
        ? "برای این تعامل قبلاً نظر ثبت شده است."
        : error.status === 403
          ? "ثبت نظر فقط بعد از گفت‌وگوی واقعی دوطرفه و بسته‌شده مجاز است."
          : error.status === 404
            ? "قابلیت نظرات در دسترس نیست."
            : "امتیاز یا متن نظر نامعتبر است.";

    return NextResponse.json(
      { error: message },
      { status: error.status }
    );
  }

  return null;
}
