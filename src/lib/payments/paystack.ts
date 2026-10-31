import { createHmac, timingSafeEqual } from "crypto";

export function paystackSignature(rawBody: string, secret: string) {
  return createHmac("sha512", secret).update(rawBody).digest("hex");
}

export function verifyPaystackSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  const expected = paystackSignature(rawBody, secret);
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export type PaystackCharge = {
  event?: string;
  data?: {
    id?: number | string;
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
  };
};

export function interpretPaystackCharge(
  event: PaystackCharge,
  expected: { reference: string; amountPesewas: number; currency: string },
) {
  if (event.event !== "charge.success" || event.data?.status !== "success") return { action: "ignore" as const };
  if (!event.data.reference || event.data.reference !== expected.reference) return { action: "reject" as const, reason: "reference" as const };
  if (event.data.currency !== expected.currency) return { action: "reject" as const, reason: "currency" as const };
  if (event.data.amount !== expected.amountPesewas) return { action: "reject" as const, reason: "amount" as const };
  return { action: "mark_paid" as const };
}

export function shouldApplyPayment(status: string) {
  return status === "PENDING" || status === "REQUIRES_ACTION";
}

export function paystackEventId(event: PaystackCharge) {
  if (event.data?.id == null) return null;
  return String(event.data.id);
}
