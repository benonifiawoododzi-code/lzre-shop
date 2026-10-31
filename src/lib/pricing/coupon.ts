export type CouponInput = {
  code: string;
  type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minMerchandise: number | null;
  maxDiscount: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  perUserLimit: number;
  usedCount: number;
  active: boolean;
  firstOrderOnly: boolean;
  categoryIds: string[];
  productIds: string[];
  sellerIds: string[];
};

export type CouponLine = {
  key: string;
  productId: string;
  categoryId: string;
  sellerId: string;
  merchandise: number;
};

export type CouponResult =
  | { ok: true; discounts: Record<string, number>; freeShipping: boolean; discountTotal: number }
  | { ok: false; message: string };

function eligible(line: CouponLine, coupon: CouponInput) {
  const unrestricted = coupon.productIds.length === 0 && coupon.categoryIds.length === 0 && coupon.sellerIds.length === 0;
  if (unrestricted) return true;
  return coupon.productIds.includes(line.productId) || coupon.categoryIds.includes(line.categoryId) || coupon.sellerIds.includes(line.sellerId);
}

function allocate(amounts: number[], total: number) {
  const base = amounts.reduce((sum, amount) => sum + amount, 0);
  if (base <= 0 || total <= 0) return amounts.map(() => 0);
  const capped = Math.min(total, base);
  const result = amounts.map((amount) => Math.floor((amount * capped) / base));
  let drift = capped - result.reduce((sum, amount) => sum + amount, 0);
  for (let index = 0; drift > 0 && index < result.length; index += 1) {
    const room = amounts[index]! - result[index]!;
    if (room <= 0) continue;
    const add = Math.min(room, drift);
    result[index] = result[index]! + add;
    drift -= add;
  }
  return result;
}

export function evaluateCoupon(input: {
  coupon: CouponInput | null;
  lines: CouponLine[];
  now: Date;
  isFirstOrder: boolean;
  userRedemptions: number;
}): CouponResult {
  const empty = { ok: true as const, discounts: Object.fromEntries(input.lines.map((line) => [line.key, 0])), freeShipping: false, discountTotal: 0 };
  if (!input.coupon) return empty;
  const coupon = input.coupon;
  if (!coupon.active) return { ok: false, message: "This coupon is not active." };
  if (coupon.startsAt && coupon.startsAt > input.now) return { ok: false, message: "This coupon is not active yet." };
  if (coupon.endsAt && coupon.endsAt < input.now) return { ok: false, message: "This coupon has expired." };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return { ok: false, message: "This coupon has reached its usage limit." };
  if (input.userRedemptions >= coupon.perUserLimit) return { ok: false, message: "You have already used this coupon." };
  if (coupon.firstOrderOnly && !input.isFirstOrder) return { ok: false, message: "This coupon is only available on a first order." };

  const lines = input.lines.filter((line) => eligible(line, coupon));
  const eligibleTotal = lines.reduce((sum, line) => sum + line.merchandise, 0);
  if (lines.length === 0 || eligibleTotal <= 0) return { ok: false, message: "This coupon does not apply to the items in your cart." };
  if (coupon.minMerchandise != null && eligibleTotal < coupon.minMerchandise) {
    return { ok: false, message: "Your cart has not reached this coupon's minimum." };
  }

  const discounts = Object.fromEntries(input.lines.map((line) => [line.key, 0]));
  if (coupon.type === "FREE_SHIPPING") {
    return { ok: true, discounts, freeShipping: true, discountTotal: 0 };
  }

  if (coupon.type === "PERCENTAGE") {
    if (coupon.value <= 0 || coupon.value > 100) return { ok: false, message: "This coupon is misconfigured." };
    const raw = lines.map((line) => Math.round((line.merchandise * coupon.value) / 100));
    const rawTotal = raw.reduce((sum, amount) => sum + amount, 0);
    const cap = coupon.maxDiscount == null ? rawTotal : Math.min(rawTotal, coupon.maxDiscount);
    const allocated = allocate(lines.map((line) => line.merchandise), cap);
    lines.forEach((line, index) => {
      discounts[line.key] = Math.min(line.merchandise, allocated[index] ?? 0);
    });
  } else {
    if (coupon.value <= 0) return { ok: false, message: "This coupon is misconfigured." };
    const allocated = allocate(lines.map((line) => line.merchandise), coupon.value);
    lines.forEach((line, index) => {
      discounts[line.key] = Math.min(line.merchandise, allocated[index] ?? 0);
    });
  }

  const discountTotal = Object.values(discounts).reduce((sum, amount) => sum + amount, 0);
  return { ok: true, discounts, freeShipping: false, discountTotal };
}
