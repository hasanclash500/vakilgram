import { NextResponse } from "next/server";
import { AccessDeniedError } from "./admin";

export function adminAccessError(error: unknown): NextResponse | null {
  if (!(error instanceof AccessDeniedError)) return null;

  return NextResponse.json(
    {
      error:
        error.status === 401
          ? "برای انجام این عملیات باید وارد شوید."
          : "دسترسی ادمین لازم است."
    },
    { status: error.status }
  );
}
