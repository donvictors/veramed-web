import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { DiscountDefinition } from "@/lib/discount-pricing";

export function normalizeDiscountCode(raw: string | null | undefined) {
  return (raw ?? "").trim().toUpperCase();
}

function getDiscountPepper() {
  const pepper = process.env.DISCOUNT_CODE_PEPPER?.trim() || process.env.AUTH_SECRET?.trim();
  if (!pepper) {
    throw new Error("DISCOUNT_CODE_PEPPER o AUTH_SECRET no está configurada.");
  }
  return pepper;
}

export function hashDiscountCode(raw: string) {
  return createHmac("sha256", getDiscountPepper())
    .update(normalizeDiscountCode(raw))
    .digest("hex");
}

export function encryptDiscountCode(raw: string) {
  const key = createHash("sha256").update(getDiscountPepper()).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(normalizeDiscountCode(raw), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function decryptDiscountCode(value: string | null) {
  if (!value) return null;
  try {
    const bytes = Buffer.from(value, "base64url");
    const key = createHash("sha256").update(getDiscountPepper()).digest();
    const decipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8");
  } catch { return null; }
}

export async function getDiscountByCode(
  raw: string | null | undefined,
): Promise<DiscountDefinition | null> {
  const code = normalizeDiscountCode(raw);
  if (!code || code.length > 80) return null;

  const discount = await prisma.discountCode.findUnique({
    where: { codeHash: hashDiscountCode(code) },
  });
  const now = Date.now();
  if (
    !discount?.active ||
    (discount.startsAt && discount.startsAt.getTime() > now) ||
    (discount.expiresAt && discount.expiresAt.getTime() <= now)
  ) {
    return null;
  }

  return {
    id: discount.id,
    type: discount.type,
    label: discount.label,
    percentOff: discount.percentOff,
    finalAmountClp: discount.finalAmountClp,
  };
}
