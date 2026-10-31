import { evaluateCoupon, type CouponInput } from "@/lib/pricing/coupon";
import { shippingAmount } from "@/lib/pricing/shipping";
import { extractInclusiveTax, type TaxComponentInput } from "@/lib/pricing/tax";

export type QuoteLineInput = {
  key: string;
  productId: string;
  categoryId: string;
  sellerId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  weightGrams: number;
};

export type SellerShippingInput = {
  price: number;
  freeThreshold: number | null;
  includedWeightGrams: number;
  extraPerKg: number | null;
};

export type Quote = {
  valid: boolean;
  errors: string[];
  lines: Array<{
    key: string;
    sellerId: string;
    variantId: string;
    quantity: number;
    unitPrice: number;
    merchandise: number;
    discount: number;
    merchandiseAfterDiscount: number;
    tax: number;
  }>;
  merchandise: number;
  discount: number;
  shipping: number;
  tax: number;
  grand: number;
  freeShipping: boolean;
  sellers: Array<{
    sellerId: string;
    merchandise: number;
    discount: number;
    shipping: number;
    ratePercent: number;
    commission: number;
    net: number;
    payable: number;
  }>;
};

export function buildQuote(input: {
  lines: QuoteLineInput[];
  coupon: CouponInput | null;
  now: Date;
  isFirstOrder: boolean;
  userRedemptions: number;
  shippingBySeller: Record<string, SellerShippingInput>;
  taxComponents: TaxComponentInput[];
  commissionRateBySeller: Record<string, number>;
}): Quote {
  const errors: string[] = [];
  for (const line of input.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) errors.push("A cart quantity is invalid.");
    if (!Number.isInteger(line.unitPrice) || line.unitPrice < 0) errors.push("A product price is invalid.");
  }

  const coupon = evaluateCoupon({
    coupon: input.coupon,
    lines: input.lines.map((line) => ({
      key: line.key,
      productId: line.productId,
      categoryId: line.categoryId,
      sellerId: line.sellerId,
      merchandise: line.unitPrice * line.quantity,
    })),
    now: input.now,
    isFirstOrder: input.isFirstOrder,
    userRedemptions: input.userRedemptions,
  });
  if (!coupon.ok) errors.push(coupon.message);

  const discounts = coupon.ok ? coupon.discounts : Object.fromEntries(input.lines.map((line) => [line.key, 0]));
  const lines = input.lines.map((line) => {
    const merchandise = line.unitPrice * line.quantity;
    const discount = Math.min(merchandise, discounts[line.key] ?? 0);
    const merchandiseAfterDiscount = merchandise - discount;
    const tax = extractInclusiveTax(merchandiseAfterDiscount, input.taxComponents).tax;
    return {
      key: line.key,
      sellerId: line.sellerId,
      variantId: line.variantId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      merchandise,
      discount,
      merchandiseAfterDiscount,
      tax,
    };
  });

  const sellerIds = [...new Set(lines.map((line) => line.sellerId))];
  const sellers = sellerIds.map((sellerId) => {
    const sellerLines = lines.filter((line) => line.sellerId === sellerId);
    const merchandise = sellerLines.reduce((sum, line) => sum + line.merchandise, 0);
    const discount = sellerLines.reduce((sum, line) => sum + line.discount, 0);
    const afterDiscount = merchandise - discount;
    const weight = input.lines.filter((line) => line.sellerId === sellerId).reduce((sum, line) => sum + line.weightGrams * line.quantity, 0);
    const rate = input.shippingBySeller[sellerId];
    if (!rate) errors.push("Delivery is not available for one of the sellers.");
    const shipping = !rate || (coupon.ok && coupon.freeShipping)
      ? 0
      : shippingAmount({
          merchandiseAfterDiscount: afterDiscount,
          weightGrams: weight,
          price: rate.price,
          freeThreshold: rate.freeThreshold,
          includedWeightGrams: rate.includedWeightGrams,
          extraPerKg: rate.extraPerKg,
        });
    const ratePercent = input.commissionRateBySeller[sellerId] ?? 0;
    const commission = Math.round((afterDiscount * ratePercent) / 100);
    const net = afterDiscount - commission;
    return { sellerId, merchandise, discount, shipping, ratePercent, commission, net, payable: net + shipping };
  });

  const merchandise = lines.reduce((sum, line) => sum + line.merchandise, 0);
  const discount = lines.reduce((sum, line) => sum + line.discount, 0);
  const shipping = sellers.reduce((sum, seller) => sum + seller.shipping, 0);
  const tax = lines.reduce((sum, line) => sum + line.tax, 0);
  return {
    valid: errors.length === 0 && lines.length > 0,
    errors,
    lines,
    merchandise,
    discount,
    shipping,
    tax,
    grand: merchandise - discount + shipping,
    freeShipping: coupon.ok && coupon.freeShipping,
    sellers,
  };
}
