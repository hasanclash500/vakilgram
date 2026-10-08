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

const schema = z.object({
  fullName: z.string().trim().min(2).max(150).optional(),
  slug: z.string().trim().regex(/^[a-z0-9-]{3,100}$/).optional(),
  licenseNumber: z.string().trim().max(100).nullable().optional(),
  city: z.string().trim().min(2).max(100).optional(),
  province: z.string().trim().max(100).nullable().optional(),
  bio: z.string().trim().max(5000).nullable().optional(),
  avatarUrl: z.string().trim().url().max(500).refine(isHttpUrl, "URL must use HTTP(S)").nullable().optional(),
  verified: z.boolean().optional(),
  active: z.boolean().optional(),
  specialties: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
  socialLinks: z.array(socialLinkSchema).max(15).optional()
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

    const lawyer = await prisma.$transaction(async (tx) => {
      await tx.lawyer.update({
        where: { id },
        data: {
          ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.licenseNumber !== undefined
            ? { licenseNumber: input.licenseNumber || null }
            : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.province !== undefined
            ? { province: input.province || null }
            : {}),
          ...(input.bio !== undefined ? { bio: input.bio || null } : {}),
          ...(input.avatarUrl !== undefined
            ? { avatarUrl: input.avatarUrl || null }
            : {}),
          ...(input.verified !== undefined ? { verified: input.verified } : {}),
          ...(input.active !== undefined ? { active: input.active } : {})
        }
      });

      if (input.specialties) {
        await tx.lawyerSpecialty.deleteMany({ where: { lawyerId: id } });
        const uniqueAreas = [...new Set(input.specialties)];
        if (uniqueAreas.length > 0) {
          await tx.lawyerSpecialty.createMany({
            data: uniqueAreas.map((area) => ({ lawyerId: id, area }))
          });
        }
      }

      if (input.socialLinks) {
        await tx.lawyerSocialLink.deleteMany({ where: { lawyerId: id } });
        if (input.socialLinks.length > 0) {
          await tx.lawyerSocialLink.createMany({
            data: input.socialLinks.map((link) => ({
              lawyerId: id,
              platform: link.platform,
              url: link.url
            }))
          });
        }
      }

      return tx.lawyer.findUniqueOrThrow({
        where: { id },
        include: {
          specialties: true,
          socialLinks: true
        }
      });
    });

    await writeAudit(prisma, {
      userId: admin.id,
      action: "LAWYER_UPDATE",
      entityType: "LAWYER",
      entityId: id,
      details: {
        changedFields: Object.keys(input)
      }
    });

    return NextResponse.json({ ok: true, lawyer });
  } catch (error) {
    const access = adminAccessError(error);
    if (access) return access;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "اطلاعات وکیل نامعتبر است.", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("admin-lawyer-update-failed", {
      message: error instanceof Error ? error.message : "unknown"
    });

    return NextResponse.json(
      { error: "به‌روزرسانی وکیل انجام نشد." },
      { status: 400 }
    );
  }
}
