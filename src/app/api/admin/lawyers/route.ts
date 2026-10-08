import { NextResponse } from "next/server";
import { z } from "zod";
import { isHttpUrl } from "@/lib/url/http";
import { adminAccessError } from "@/lib/auth/api";
import { requireAdminUser } from "@/lib/auth/admin";
import { writeAudit } from "@/lib/audit/write-audit";
import { getPrisma } from "@/lib/db/prisma";

const socialLinkSchema = z.object({
  platform: z.string().trim().min(1).max(40),
  url: z.string().trim().url().max(500).refine(isHttpUrl, "URL must use HTTP(S)")
});

const lawyerSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  slug: z.string().trim().regex(/^[a-z0-9-]{3,100}$/),
  licenseNumber: z.string().trim().max(100).nullable().optional(),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().max(100).nullable().optional(),
  bio: z.string().trim().max(5000).nullable().optional(),
  avatarUrl: z.string().trim().url().max(500).refine(isHttpUrl, "URL must use HTTP(S)").nullable().optional(),
  verified: z.boolean().default(false),
  active: z.boolean().default(true),
  specialties: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  socialLinks: z.array(socialLinkSchema).max(15).default([])
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    const input = lawyerSchema.parse(await request.json());
    const prisma = getPrisma();

    const lawyer = await prisma.lawyer.create({
      data: {
        fullName: input.fullName,
        slug: input.slug,
        licenseNumber: input.licenseNumber || null,
        city: input.city,
        province: input.province || null,
        bio: input.bio || null,
        avatarUrl: input.avatarUrl || null,
        verified: input.verified,
        active: input.active,
        specialties: {
          create: [...new Set(input.specialties)].map((area) => ({ area }))
        },
        socialLinks: {
          create: input.socialLinks
        }
      },
      include: {
        specialties: true,
        socialLinks: true
      }
    });

    await writeAudit(prisma, {
      userId: admin.id,
      action: "LAWYER_CREATE",
      entityType: "LAWYER",
      entityId: lawyer.id,
      details: {
        fullName: lawyer.fullName,
        city: lawyer.city,
        verified: lawyer.verified
      }
    });

    return NextResponse.json({ ok: true, lawyer }, { status: 201 });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "اطلاعات وکیل نامعتبر است.", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("admin-lawyer-create-failed", {
      message: error instanceof Error ? error.message : "unknown"
    });

    return NextResponse.json(
      { error: "ساخت پروفایل وکیل انجام نشد؛ Slug یا شماره پروانه را بررسی کنید." },
      { status: 400 }
    );
  }
}
