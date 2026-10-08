import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";
import { importLawyerCsv } from "@/modules/lawyers/csv-import";

const schema = z.object({
  csv: z.string().min(1)
});

const MAX_BODY_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    const rawBody = await request.text();

    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "حجم فایل بیشتر از ۲ مگابایت است." },
        { status: 413 }
      );
    }

    const input = schema.parse(JSON.parse(rawBody));
    const prisma = getPrisma();
    const result = await importLawyerCsv(prisma, input.csv);

    await writeAudit(prisma, {
      userId: admin.id,
      action: "LAWYER_BULK_IMPORT",
      entityType: "LAWYER",
      details: {
        created: result.created
      }
    });

    return NextResponse.json({
      ok: true,
      created: result.created
    });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "فایل CSV یا درخواست نامعتبر است." },
        { status: 400 }
      );
    }

    console.error("admin-lawyer-bulk-import-failed", {
      name: error instanceof Error ? error.name : "unknown"
    });

    return NextResponse.json(
      {
        error:
          "ورود گروهی انجام نشد. ساختار CSV، یکتایی Slug و شماره پروانه را بررسی کنید."
      },
      { status: 400 }
    );
  }
}
