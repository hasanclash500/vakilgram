import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from "node:crypto";
import { cookies } from "next/headers";
import type {
  Prisma,
  PrismaClient
} from "@/generated/prisma/client";
import {
  buildOtpAuthUri,
  generateRecoveryCodes,
  generateTotpSecret,
  verifyTotp
} from "./totp";

const COOKIE_NAME = "vg_admin_2fa";
const COOKIE_MAX_AGE_SECONDS = 12 * 60 * 60;

function encryptionKey(): Buffer {
  const value = process.env.ADMIN_2FA_ENCRYPTION_KEY?.trim();

  if (!value) {
    throw new Error("ADMIN_2FA_ENCRYPTION_KEY is not configured");
  }

  const key = Buffer.from(value, "base64");

  if (key.length !== 32) {
    throw new Error(
      "ADMIN_2FA_ENCRYPTION_KEY must decode to exactly 32 bytes"
    );
  }

  return key;
}

function cookieSecret(): string {
  const value =
    process.env.ADMIN_2FA_COOKIE_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim();

  if (!value || value.length < 24) {
    throw new Error("Admin 2FA cookie secret is not configured");
  }

  return value;
}

function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    encryptionKey(),
    iv
  );

  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final()
  ]);

  return {
    secretCiphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64")
  };
}

function decryptSecret(input: {
  secretCiphertext: string;
  iv: string;
  authTag: string;
}) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(input.iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(input.authTag, "base64"));

  return Buffer.concat([
    decipher.update(
      Buffer.from(input.secretCiphertext, "base64")
    ),
    decipher.final()
  ]).toString("utf8");
}

function recoveryHash(code: string): string {
  return createHash("sha256")
    .update("vakilgram-admin-recovery\0" + code.trim().toUpperCase())
    .digest("hex");
}

function asRecoveryHashes(value: Prisma.JsonValue): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function signPayload(payload: string): string {
  return createHmac("sha256", cookieSecret())
    .update(payload)
    .digest("base64url");
}

function makeCookieToken(userId: string, expiresAt: number): string {
  const payload = userId + "." + expiresAt;
  return payload + "." + signPayload(payload);
}

function verifyCookieToken(
  token: string | undefined,
  userId: string
): boolean {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [tokenUserId, expiresRaw, signature] = parts;
  if (!tokenUserId || !expiresRaw || !signature) return false;
  if (tokenUserId !== userId) return false;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
    return false;
  }

  const expected = signPayload(tokenUserId + "." + expiresRaw);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  return (
    left.length === right.length &&
    timingSafeEqual(left, right)
  );
}

export async function adminTwoFactorEnabled(
  prisma: PrismaClient,
  userId: string
): Promise<boolean> {
  const record = await prisma.adminTwoFactor.findUnique({
    where: { userId },
    select: { enabled: true }
  });

  return Boolean(record?.enabled);
}

export async function isAdminTwoFactorSatisfied(
  prisma: PrismaClient,
  userId: string
): Promise<boolean> {
  const enabled = await adminTwoFactorEnabled(prisma, userId);
  if (!enabled) return true;

  const cookieStore = await cookies();
  return verifyCookieToken(
    cookieStore.get(COOKIE_NAME)?.value,
    userId
  );
}

export async function issueAdminTwoFactorCookie(
  userId: string
) {
  const expiresAt =
    Date.now() + COOKIE_MAX_AGE_SECONDS * 1000;
  const cookieStore = await cookies();

  cookieStore.set({
    name: COOKIE_NAME,
    value: makeCookieToken(userId, expiresAt),
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/"
  });
}

export async function clearAdminTwoFactorCookie() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });
}

export async function beginAdminTwoFactorSetup(
  prisma: PrismaClient,
  userId: string,
  accountLabel: string
) {
  const secret = generateTotpSecret();
  const encrypted = encryptSecret(secret);
  const recoveryCodes = generateRecoveryCodes();
  const hashes = recoveryCodes.map(recoveryHash);

  await prisma.adminTwoFactor.upsert({
    where: { userId },
    create: {
      userId,
      ...encrypted,
      recoveryCodeHashes: hashes,
      enabled: false
    },
    update: {
      ...encrypted,
      recoveryCodeHashes: hashes,
      enabled: false,
      verifiedAt: null
    }
  });

  return {
    secret,
    recoveryCodes,
    otpAuthUri: buildOtpAuthUri(
      secret,
      accountLabel || userId
    )
  };
}

export async function enableAdminTwoFactor(
  prisma: PrismaClient,
  userId: string,
  code: string,
  now = Date.now()
) {
  const record = await prisma.adminTwoFactor.findUnique({
    where: { userId }
  });

  if (!record) return false;

  const secret = decryptSecret(record);

  if (!verifyTotp(secret, code, now)) {
    return false;
  }

  await prisma.adminTwoFactor.update({
    where: { userId },
    data: {
      enabled: true,
      verifiedAt: new Date(now)
    }
  });

  await issueAdminTwoFactorCookie(userId);
  return true;
}

export async function verifyAdminSecondFactor(
  prisma: PrismaClient,
  userId: string,
  code: string,
  now = Date.now()
) {
  const record = await prisma.adminTwoFactor.findUnique({
    where: { userId }
  });

  if (!record?.enabled) return false;

  const clean = code.trim().toUpperCase();
  const secret = decryptSecret(record);

  if (verifyTotp(secret, clean, now)) {
    await issueAdminTwoFactorCookie(userId);
    return true;
  }

  const hashes = asRecoveryHashes(record.recoveryCodeHashes);
  const candidate = recoveryHash(clean);
  const index = hashes.findIndex((hash) => {
    const left = Buffer.from(hash);
    const right = Buffer.from(candidate);

    return (
      left.length === right.length &&
      timingSafeEqual(left, right)
    );
  });

  if (index < 0) return false;

  hashes.splice(index, 1);

  await prisma.adminTwoFactor.update({
    where: { userId },
    data: {
      recoveryCodeHashes: hashes
    }
  });

  await issueAdminTwoFactorCookie(userId);
  return true;
}

export async function disableAdminTwoFactor(
  prisma: PrismaClient,
  userId: string
) {
  await prisma.adminTwoFactor.deleteMany({
    where: { userId }
  });

  await clearAdminTwoFactorCookie();
}
