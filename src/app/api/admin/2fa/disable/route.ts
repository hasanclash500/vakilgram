import { NextResponse } from "next/server";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";
import { disableAdminTwoFactor } from "@/modules/auth/admin-2fa";

export async function POST() {
  try {
    const admin = await requireAdminUser();
    const prisma = getPrisma();

    await disableAdminTwoFactor(prisma, admin.id);

    await writeAudit(prisma, {
      userId: admin.id,
      action: "ADMIN_2FA_DISABLE",
      entityType: "USER",
      entityId: admin.id
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    return NextResponse.json(
      { error: "غیرفعال‌سازی 2FA انجام نشد." },
      { status: 503 }
    );
  }
}
