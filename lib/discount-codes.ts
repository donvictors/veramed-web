export type DiscountDefinition = {
  code: string;
  type: "percent_off" | "fixed_final_amount";
  percentOff?: number;
  finalAmountClp?: number;
  label: string;
};

const DISCOUNT_DEFINITIONS: DiscountDefinition[] = [
  {
    code: "DESCUENTITON123",
    type: "percent_off",
    percentOff: 30,
    label: "Descuento 30%",
  },
  {
    code: "TEST_50P_1234",
    type: "fixed_final_amount",
    finalAmountClp: 50,
    label: "Precio final $50",
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

  let finalAmount = baseAmount;
  if (discount.type === "percent_off") {
    const percentOff = Math.max(0, Math.min(100, Math.round(discount.percentOff ?? 0)));
    finalAmount = Math.round((baseAmount * (100 - percentOff)) / 100);
  } else {
    const target = Math.max(0, Math.round(discount.finalAmountClp ?? baseAmount));
    finalAmount = Math.min(baseAmount, target);
  }

  return {
    discount,
    baseAmount,
    discountAmount: Math.max(0, baseAmount - finalAmount),
    finalAmount,
    appliedCode: discount.code,
  };
}
