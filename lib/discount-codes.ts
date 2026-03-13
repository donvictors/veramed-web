export type DiscountDefinition = {
  code: string;
  percentOff: number;
  label: string;
};

const DISCOUNT_DEFINITIONS: DiscountDefinition[] = [
  {
    code: "DESCUENTITON123",
    percentOff: 30,
    label: "Descuento 30%",
  },
];

const DISCOUNTS_BY_CODE = new Map(
  DISCOUNT_DEFINITIONS.map((discount) => [discount.code, discount]),
);

export function normalizeDiscountCode(raw: string | null | undefined) {
  return (raw ?? "").trim().toUpperCase();
}

export function getDiscountByCode(raw: string | null | undefined) {
  const code = normalizeDiscountCode(raw);
  if (!code) {
    return null;
  }
  return DISCOUNTS_BY_CODE.get(code) ?? null;
}

export function calculateDiscountedAmount(baseAmount: number, rawCode?: string | null) {
  const discount = getDiscountByCode(rawCode);
  if (!discount) {
    return {
      discount: null,
      baseAmount,
      discountAmount: 0,
      finalAmount: baseAmount,
      appliedCode: "",
    };
  }

  const finalAmount = Math.round((baseAmount * (100 - discount.percentOff)) / 100);
  return {
    discount,
    baseAmount,
    discountAmount: baseAmount - finalAmount,
    finalAmount,
    appliedCode: discount.code,
  };
}
