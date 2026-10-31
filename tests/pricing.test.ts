import { describe, expect, it } from "vitest";
import { evaluateCoupon } from "@/lib/pricing/coupon";
import { ledgerTotals, payoutLedger, refundLedger, saleLedger } from "@/lib/pricing/ledger";
import { cedisToPesewas, discountPercent, pesewasToDecimal } from "@/lib/pricing/money";
import { buildQuote } from "@/lib/pricing/quote";
import { shippingAmount } from "@/lib/pricing/shipping";
import { extractInclusiveTax } from "@/lib/pricing/tax";

const now = new Date("2026-10-31T00:00:00Z");

const baseCoupon = {
  code: "WELCOME10",
  type: "PERCENTAGE" as const,
  value: 10,
  minMerchandise: 10000,
  maxDiscount: null,
  startsAt: null,
  endsAt: null,
  usageLimit: 100,
  perUserLimit: 1,
  usedCount: 0,
  active: true,
  firstOrderOnly: false,
  categoryIds: [] as string[],
  productIds: [] as string[],
  sellerIds: [] as string[],
};

describe("money", () => {
  it("round-trips cedis and pesewas", () => {
    expect(cedisToPesewas("1899.00")).toBe(189900);
    expect(cedisToPesewas("0.10")).toBe(10);
    expect(pesewasToDecimal(189900)).toBe("1899.00");
    expect(pesewasToDecimal(10)).toBe("0.10");
  });

  it("only shows a discount when the compare price is higher", () => {
    expect(discountPercent(8000, 10000)).toBe(20);
    expect(discountPercent(10000, 8000)).toBeNull();
    expect(discountPercent(10000, null)).toBeNull();
  });
});

describe("tax", () => {
  it("extracts demonstration Ghana-style inclusive tax", () => {
    const result = extractInclusiveTax(12075, [
      { code: "NHIL", name: "NHIL", ratePercent: 2.5, sequence: 1, applyOn: "NET" },
      { code: "GETFUND", name: "GETFund", ratePercent: 2.5, sequence: 2, applyOn: "NET" },
      { code: "VAT", name: "VAT", ratePercent: 15, sequence: 3, applyOn: "RUNNING" },
    ]);
    expect(result.net).toBe(10000);
    expect(result.tax).toBe(2075);
    expect(result.net + result.tax).toBe(12075);
  });
});

describe("coupons", () => {
  const lines = [
    { key: "a", productId: "p1", categoryId: "c1", sellerId: "s1", merchandise: 15000 },
    { key: "b", productId: "p2", categoryId: "c2", sellerId: "s2", merchandise: 5000 },
  ];

  it("rejects an expired coupon", () => {
    const result = evaluateCoupon({
      coupon: { ...baseCoupon, endsAt: new Date("2026-01-01T00:00:00Z") },
      lines,
      now,
      isFirstOrder: true,
      userRedemptions: 0,
    });
    expect(result.ok).toBe(false);
  });

  it("applies a percentage only to eligible lines", () => {
    const result = evaluateCoupon({
      coupon: { ...baseCoupon, sellerIds: ["s1"], minMerchandise: 1000 },
      lines,
      now,
      isFirstOrder: true,
      userRedemptions: 0,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.discounts.a).toBe(1500);
      expect(result.discounts.b).toBe(0);
    }
  });
});

describe("quote, shipping, and ledger", () => {
  it("keeps commission off shipping and balances the ledger", () => {
    const quote = buildQuote({
      lines: [
        { key: "a", productId: "p1", categoryId: "c1", sellerId: "s1", variantId: "v1", quantity: 1, unitPrice: 10000, weightGrams: 500 },
        { key: "b", productId: "p2", categoryId: "c2", sellerId: "s2", variantId: "v2", quantity: 2, unitPrice: 2500, weightGrams: 200 },
      ],
      coupon: { ...baseCoupon, value: 10, minMerchandise: 1000 },
      now,
      isFirstOrder: true,
      userRedemptions: 0,
      shippingBySeller: {
        s1: { price: 1500, freeThreshold: null, includedWeightGrams: 5000, extraPerKg: null },
        s2: { price: 2000, freeThreshold: 4000, includedWeightGrams: 5000, extraPerKg: 500 },
      },
      taxComponents: [],
      commissionRateBySeller: { s1: 10, s2: 5 },
    });
    expect(quote.valid).toBe(true);
    expect(quote.discount).toBe(1500);
    expect(quote.shipping).toBe(1500);
    expect(quote.grand).toBe(15000 - 1500 + 1500);
    const sellerOne = quote.sellers.find((seller) => seller.sellerId === "s1");
    expect(sellerOne?.commission).toBe(Math.round(9000 * 0.1));
    const lines = saleLedger(quote.sellers.map((seller) => ({ sellerId: seller.sellerId, commission: seller.commission, payable: seller.payable })), "CASH");
    expect(ledgerTotals(lines).balanced).toBe(true);
    expect(ledgerTotals(lines).debit).toBe(quote.grand);
  });

  it("adds a weight surcharge and waives shipping at the threshold", () => {
    expect(shippingAmount({ merchandiseAfterDiscount: 1000, weightGrams: 6500, price: 2000, freeThreshold: null, includedWeightGrams: 5000, extraPerKg: 400 })).toBe(2800);
    expect(shippingAmount({ merchandiseAfterDiscount: 5000, weightGrams: 9000, price: 2000, freeThreshold: 5000, includedWeightGrams: 5000, extraPerKg: 400 })).toBe(0);
  });

  it("rejects an unbalanced refund and balances a payout", () => {
    expect(refundLedger({ amount: 1000, commissionReversal: 100, sellerClawback: 800 }).ok).toBe(false);
    const refund = refundLedger({ amount: 1000, commissionReversal: 100, sellerClawback: 900 });
    expect(refund.ok).toBe(true);
    if (refund.ok) expect(ledgerTotals(refund.lines).balanced).toBe(true);
    expect(ledgerTotals(payoutLedger(500, "s1")).balanced).toBe(true);
  });
});
