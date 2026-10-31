import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { parseProductCsv } from "@/lib/catalog/csv";
import { planCommit, planRelease, planReserve } from "@/lib/inventory/stock";
import { canTransitionFulfillment, canTransitionOrder, sandboxSettlement } from "@/lib/orders/transitions";
import { interpretPaystackCharge, paystackSignature, shouldApplyPayment, verifyPaystackSignature } from "@/lib/payments/paystack";
import { canManageSellerOrder, canReadOrder, canSetCommission } from "@/lib/permissions";
import { sniffImage } from "@/lib/security/files";
import { consumeRate } from "@/lib/security/rate-limit";
import { formatOrderNumber, isPromotionLive, readSignedValue, safeInternalPath, signValue } from "@/lib/security/tokens";
import { normalizeSearchTerm } from "@/lib/catalog/csv";

describe("orders and stock", () => {
  it("allows a verified payment to mark an order paid and keeps sandbox unpaid", () => {
    expect(canTransitionOrder("PENDING_PAYMENT", "PAID")).toBe(false);
    expect(canTransitionOrder("PENDING_PAYMENT", "PAID", { paymentVerified: true })).toBe(true);
    expect(canTransitionOrder("SHIPPED", "PENDING_PAYMENT")).toBe(false);
    expect(canTransitionFulfillment("PACKED", "SHIPPED")).toBe(true);
    expect(canTransitionFulfillment("SHIPPED", "CANCELLED")).toBe(false);
    expect(sandboxSettlement()).toEqual({ paymentStatus: "SIMULATED", orderStatus: "PROCESSING", paid: false });
  });

  it("reserves only available stock and commits a held quantity", () => {
    expect(planReserve(5, 2, 4).ok).toBe(false);
    expect(planReserve(5, 2, 3)).toEqual({ ok: true, reserved: 5 });
    expect(planCommit(5, 3, 3)).toEqual({ ok: true, onHand: 2, reserved: 0 });
    expect(planRelease(3, 4).ok).toBe(false);
  });

  it("formats an unguessable order number", () => {
    expect(formatOrderNumber(new Date("2026-10-31T12:00:00Z"), "AB23CD")).toBe("LZ20261031AB23CD");
  });
});

describe("permissions", () => {
  const seller = { id: "u1", roles: ["SELLER" as const, "CUSTOMER" as const], sellerId: "s1", status: "ACTIVE" as const };
  const other = { id: "u2", roles: ["SELLER" as const], sellerId: "s2", status: "ACTIVE" as const };
  const admin = { id: "admin", roles: ["ADMIN" as const], status: "ACTIVE" as const };

  it("isolates seller orders and commission changes", () => {
    expect(canManageSellerOrder(seller, "s1")).toBe(true);
    expect(canManageSellerOrder(seller, "s2")).toBe(false);
    expect(canManageSellerOrder(other, "s1")).toBe(false);
    expect(canManageSellerOrder(admin, "s2")).toBe(true);
    expect(canSetCommission(seller)).toBe(false);
    expect(canSetCommission(admin)).toBe(true);
    expect(canReadOrder(seller, "u9")).toBe(false);
    expect(canReadOrder({ ...seller, id: "u9" }, "u9")).toBe(true);
  });
});

describe("paystack", () => {
  const secret = "test-secret";
  const body = JSON.stringify({ event: "charge.success", data: { id: 99, status: "success", reference: "lzre_1", amount: 2500, currency: "GHS" } });

  it("verifies the signature and rejects a wrong amount", () => {
    const signature = createHmac("sha512", secret).update(body).digest("hex");
    expect(signature).toBe(paystackSignature(body, secret));
    expect(verifyPaystackSignature(body, signature, secret)).toBe(true);
    expect(verifyPaystackSignature(body, "nope", secret)).toBe(false);
    expect(verifyPaystackSignature(body, signature, "")).toBe(false);
    const event = JSON.parse(body);
    expect(interpretPaystackCharge(event, { reference: "lzre_1", amountPesewas: 2500, currency: "GHS" })).toEqual({ action: "mark_paid" });
    expect(interpretPaystackCharge(event, { reference: "lzre_1", amountPesewas: 2400, currency: "GHS" })).toEqual({ action: "reject", reason: "amount" });
    expect(shouldApplyPayment("PAID")).toBe(false);
    expect(shouldApplyPayment("PENDING")).toBe(true);
  });
});

describe("search, files, promotions, and limits", () => {
  it("normalizes search and ignores expensive wildcards", () => {
    expect(normalizeSearchTerm("  halo% ")).toBe("halo");
    expect(normalizeSearchTerm("a")).toBeNull();
  });

  it("sniffs images and rejects a renamed text file", () => {
    expect(sniffImage(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(sniffImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe("image/png");
    expect(sniffImage(new TextEncoder().encode("<html>"))).toBeNull();
  });

  it("hides expired promotions and blocks external links", () => {
    expect(isPromotionLive({ active: true, startsAt: null, endsAt: new Date("2026-01-01") }, new Date("2026-10-31"))).toBe(false);
    expect(isPromotionLive({ active: true, startsAt: null, endsAt: null }, new Date())).toBe(true);
    expect(safeInternalPath("/products")).toBe("/products");
    expect(safeInternalPath("https://evil.example")).toBeNull();
    expect(safeInternalPath("//evil.example")).toBeNull();
  });

  it("signs guest values and rate limits", () => {
    const signed = signValue("guest-key", "secret");
    expect(readSignedValue(signed, "secret")).toBe("guest-key");
    expect(readSignedValue(signed, "other")).toBeNull();
    const store = new Map();
    expect(consumeRate(store, "login", 2, 1000, 0).allowed).toBe(true);
    expect(consumeRate(store, "login", 2, 1000, 10).allowed).toBe(true);
    expect(consumeRate(store, "login", 2, 1000, 20).allowed).toBe(false);
  });

  it("parses a product import and reports a bad price", () => {
    const parsed = parseProductCsv("name,description,category,price,stock,sku,brand\nLamp,A demonstration lamp,office,45.00,4,LAMP1,Northline\nBad,Missing price,office,free,1,BAD,Northline");
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.errors).toHaveLength(1);
  });
});
