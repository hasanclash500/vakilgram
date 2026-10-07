import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";

const schema = z.object({
  verified: z.boolean().optional(),
  active: z.boolean().optional()
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

    const lawyer = await prisma.lawyer.update({
      where: { id },
      data: input,
      select: {
        id: true,
        fullName: true,
        verified: true,
        active: true
      }
    });

    await writeAudit(prisma, {
      userId: admin.id,
      action: "LAWYER_STATUS_UPDATE",
      entityType: "LAWYER",
      entityId: id,
      details: input
    });

    return NextResponse.json({ ok: true, lawyer });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "وضعیت وکیل نامعتبر است." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "به‌روزرسانی وکیل انجام نشد." },
      { status: 400 }
    );
  }
}
