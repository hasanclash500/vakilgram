import {
  createHmac,
  randomBytes,
  timingSafeEqual
} from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(input: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output +=
        BASE32_ALPHABET[(value >>> (bits - 5)) & 31] ?? "";
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31] ?? "";
  }

  return output;
}

export function base32Decode(value: string): Buffer {
  const normalized = value
    .toUpperCase()
    .replace(/=+$/g, "")
    .replace(/\s+/g, "");

  let bits = 0;
  let buffer = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) {
      throw new Error("Invalid Base32 secret");
    }

    buffer = (buffer << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateTotpSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", key)
    .update(counterBuffer)
    .digest();

  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  return String(binary % 1_000_000).padStart(6, "0");
}

export function totpCode(
  secret: string,
  now = Date.now(),
  stepSeconds = 30
): string {
  const counter = Math.floor(now / 1000 / stepSeconds);
  return hotp(secret, counter);
}

function safeCodeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);

  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyTotp(
  secret: string,
  code: string,
  now = Date.now(),
  window = 1
): boolean {
  const clean = code.trim();

  if (!/^\d{6}$/.test(clean)) return false;

  const stepMs = 30_000;

  for (let offset = -window; offset <= window; offset += 1) {
    if (
      safeCodeEqual(
        totpCode(secret, now + offset * stepMs),
        clean
      )
    ) {
      return true;
    }
  }

  return false;
}

export function buildOtpAuthUri(
  secret: string,
  account: string,
  issuer = "Vakilgram"
): string {
  const label =
    encodeURIComponent(issuer) + ":" + encodeURIComponent(account);

  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30"
  });

  return "otpauth://totp/" + label + "?" + params.toString();
}

export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(8).toString("hex").toUpperCase();
    return raw.match(/.{1,4}/g)!.join("-");
  });
}
