export type DiscountDefinition = {
  id?: string;
  type: "percent_off" | "fixed_final_amount";
  percentOff?: number | null;
  finalAmountClp?: number | null;
  label: string;
};

export type DiscountPricing = {
  discount: DiscountDefinition | null;
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
};

export function calculateDiscountedAmount(
  baseAmount: number,
  discount?: DiscountDefinition | null,
): DiscountPricing {
  const safeBaseAmount = Math.max(0, Math.round(baseAmount));
  if (!discount) {
    return {
      discount: null,
      baseAmount: safeBaseAmount,
      discountAmount: 0,
      finalAmount: safeBaseAmount,
    };
  }

  let finalAmount = safeBaseAmount;
  if (discount.type === "percent_off") {
    const percentOff = Math.max(0, Math.min(100, Math.round(discount.percentOff ?? 0)));
    finalAmount = Math.round((safeBaseAmount * (100 - percentOff)) / 100);
  } else {
    finalAmount = Math.min(
      safeBaseAmount,
      Math.max(0, Math.round(discount.finalAmountClp ?? safeBaseAmount)),
    );
  }

  return {
    discount,
    baseAmount: safeBaseAmount,
    discountAmount: Math.max(0, safeBaseAmount - finalAmount),
    finalAmount,
  };
}
