import { NextResponse } from "next/server";
import { UserAccessDeniedError } from "@/lib/auth/user";
import { ChatError } from "./service";

export function chatErrorResponse(
  error: unknown
): NextResponse | null {
  if (error instanceof UserAccessDeniedError) {
    return NextResponse.json(
      {
        error:
          error.status === 401
            ? "برای استفاده از چت باید وارد شوید."
            : "دسترسی به این چت برای شما مجاز نیست."
      },
      { status: error.status }
    );
  }

  if (error instanceof ChatError) {
    const message =
      error.status === 404
        ? "چت موردنظر در دسترس نیست."
        : error.status === 403
          ? "دسترسی به این چت مجاز نیست."
          : error.status === 409
            ? "این چت در وضعیت قابل ارسال نیست."
            : "اطلاعات چت نامعتبر است.";

    return NextResponse.json(
      { error: message },
      { status: error.status }
    );
  }

  return null;
}
