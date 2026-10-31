"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, readGuestKey } from "@/lib/current-user";
import { placeOrder, settleSandbox } from "@/lib/commerce/checkout";
import { ensureGuestKey } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/security/rate-limit";
import { addressSchema, checkoutDetailsSchema } from "@/lib/validation/schemas";

export async function placeOrderAction(payload: {
  idempotencyKey: string;
  customer: { name: string; email: string; phone: string; note?: string };
  address: { fullName: string; phone: string; line1: string; line2?: string; city: string; region: string; ghanaPostGps?: string; postalCode?: string; instructions?: string };
  methodCode: string;
  paymentChoice: "PAYSTACK" | "CASH_ON_DELIVERY" | "SANDBOX";
  saveAddress?: boolean;
}) {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`checkout:${ip}`, 8, 10 * 60_000).allowed) return { ok: false as const, message: "Too many checkout attempts. Wait and try again." };
  const customer = checkoutDetailsSchema.safeParse(payload.customer);
  const address = addressSchema.safeParse({ ...payload.address, isDefault: false });
  if (!customer.success) return { ok: false as const, message: customer.error.issues[0]?.message ?? "Check the customer details." };
  if (!address.success) return { ok: false as const, message: address.error.issues[0]?.message ?? "Check the delivery address." };
  const user = await getCurrentUser();
  const guestKey = user ? await readGuestKey() : await ensureGuestKey();
  if (user && payload.saveAddress) {
    if (payload.address && address.data.isDefault) await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    await prisma.address.create({
      data: {
        userId: user.id,
        fullName: address.data.fullName,
        phone: address.data.phone,
        line1: address.data.line1,
        line2: address.data.line2 || null,
        city: address.data.city,
        region: address.data.region,
        ghanaPostGps: address.data.ghanaPostGps || null,
        postalCode: address.data.postalCode || null,
        instructions: address.data.instructions || null,
        country: "GH",
        isDefault: true,
      },
    });
  }
  const result = await placeOrder({
    idempotencyKey: payload.idempotencyKey,
    userId: user?.id ?? null,
    guestKey,
    customer: customer.data,
    address: { ...address.data, country: "GH", line2: address.data.line2 || undefined, ghanaPostGps: address.data.ghanaPostGps || undefined, instructions: address.data.instructions || undefined },
    methodCode: payload.methodCode,
    paymentChoice: payload.paymentChoice,
  });
  if (result.ok && result.paymentMethod === "CASH_ON_DELIVERY") redirect(`/checkout/confirmation/${result.orderId}`);
  return result;
}

export async function sandboxPaymentAction(orderId: string, success: boolean) {
  const result = await settleSandbox(orderId, success);
  if (result.ok && success) redirect(`/checkout/confirmation/${orderId}`);
}
