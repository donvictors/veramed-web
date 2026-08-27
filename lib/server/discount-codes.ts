import "server-only";

import { createHmac } from "node:crypto";
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
