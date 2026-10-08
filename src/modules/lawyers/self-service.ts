import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { isHttpUrl } from "@/lib/url/http";
import { writeAudit } from "@/lib/audit/write-audit";

const socialLinkSchema = z.object({
  platform: z.string().trim().min(1).max(40),
  url: z
    .string()
    .trim()
    .url()
    .max(500)
    .refine(isHttpUrl, "URL must use HTTP(S)")
});

export const selfLawyerProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  slug: z.string().trim().regex(/^[a-z0-9-]{3,100}$/),
  licenseNumber: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().max(100).nullable().optional(),
  bio: z.string().trim().max(5000).nullable().optional(),
  avatarUrl: z
    .string()
    .trim()
    .url()
    .max(500)
    .refine(isHttpUrl, "URL must use HTTP(S)")
    .nullable()
    .optional(),
  specialties: z
    .array(z.string().trim().min(1).max(100))
    .max(30)
    .default([]),
  socialLinks: z.array(socialLinkSchema).max(15).default([])
});

export type SelfLawyerProfileInput = z.infer<
  typeof selfLawyerProfileSchema
>;

async function replaceRelations(
  tx: Parameters<
    Parameters<PrismaClient["$transaction"]>[0]
  >[0],
  lawyerId: string,
  input: SelfLawyerProfileInput
) {
  await tx.lawyerSpecialty.deleteMany({
    where: { lawyerId }
  });

  const specialties = [...new Set(input.specialties)];
  if (specialties.length > 0) {
    await tx.lawyerSpecialty.createMany({
      data: specialties.map((area) => ({
        lawyerId,
        area
      }))
    });
  }

  await tx.lawyerSocialLink.deleteMany({
    where: { lawyerId }
  });

  if (input.socialLinks.length > 0) {
    await tx.lawyerSocialLink.createMany({
      data: input.socialLinks.map((link) => ({
        lawyerId,
        platform: link.platform,
        url: link.url
      }))
    });
  }
}

export async function createOwnLawyerProfile(
  prisma: PrismaClient,
  userId: string,
  input: SelfLawyerProfileInput
) {
  const existing = await prisma.lawyer.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (existing) {
    throw new Error("LAWYER_PROFILE_EXISTS");
  }

  const lawyer = await prisma.$transaction(async (tx) => {
    const created = await tx.lawyer.create({
      data: {
        userId,
        fullName: input.fullName,
        slug: input.slug,
        licenseNumber: input.licenseNumber,
        city: input.city,
        province: input.province || null,
        bio: input.bio || null,
        avatarUrl: input.avatarUrl || null,
        verified: false,
        active: true
      }
    });

    await replaceRelations(tx, created.id, input);

    await tx.wallet.upsert({
      where: { lawyerId: created.id },
      create: {
        lawyerId: created.id,
        balance: 0n
      },
      update: {}
    });

    await tx.user.update({
      where: { id: userId },
      data: { role: "LAWYER" }
    });

    return tx.lawyer.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        specialties: true,
        socialLinks: true
      }
    });
  });

  await writeAudit(prisma, {
    userId,
    action: "LAWYER_SELF_CREATE",
    entityType: "LAWYER",
    entityId: lawyer.id,
    details: {
      verified: false,
      licenseNumberSubmitted: true
    }
  });

  return lawyer;
}

export async function updateOwnLawyerProfile(
  prisma: PrismaClient,
  userId: string,
  input: SelfLawyerProfileInput
) {
  const existing = await prisma.lawyer.findUnique({
    where: { userId },
    select: {
      id: true,
      licenseNumber: true,
      verified: true
    }
  });

  if (!existing) {
    throw new Error("LAWYER_PROFILE_NOT_FOUND");
  }

  const licenseChanged =
    (existing.licenseNumber ?? "") !== input.licenseNumber;

  const lawyer = await prisma.$transaction(async (tx) => {
    await tx.lawyer.update({
      where: { id: existing.id },
      data: {
        fullName: input.fullName,
        slug: input.slug,
        licenseNumber: input.licenseNumber,
        city: input.city,
        province: input.province || null,
        bio: input.bio || null,
        avatarUrl: input.avatarUrl || null,
        ...(licenseChanged ? { verified: false } : {})
      }
    });

    await replaceRelations(tx, existing.id, input);

    return tx.lawyer.findUniqueOrThrow({
      where: { id: existing.id },
      include: {
        specialties: true,
        socialLinks: true
      }
    });
  });

  await writeAudit(prisma, {
    userId,
    action: "LAWYER_SELF_UPDATE",
    entityType: "LAWYER",
    entityId: lawyer.id,
    details: {
      licenseChanged,
      verificationReset:
        licenseChanged && existing.verified
    }
  });

  return lawyer;
}
