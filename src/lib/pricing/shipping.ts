export function shippingAmount(input: {
  merchandiseAfterDiscount: number;
  weightGrams: number;
  price: number;
  freeThreshold: number | null;
  includedWeightGrams: number;
  extraPerKg: number | null;
}) {
  if (input.freeThreshold != null && input.merchandiseAfterDiscount >= input.freeThreshold) return 0;
  let amount = input.price;
  if (input.extraPerKg != null && input.weightGrams > input.includedWeightGrams) {
    const extraKg = Math.ceil((input.weightGrams - input.includedWeightGrams) / 1000);
    amount += extraKg * input.extraPerKg;
  }
  return amount;
}
