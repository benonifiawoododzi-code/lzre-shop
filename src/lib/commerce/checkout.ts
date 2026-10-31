import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { notifyUser, audit } from "@/lib/notify";
import { cedisToPesewas, pesewasToDecimal } from "@/lib/pricing/money";
import { saleLedger } from "@/lib/pricing/ledger";
import { canTransitionOrder } from "@/lib/orders/transitions";
import { formatOrderNumber, randomOrderSuffix } from "@/lib/security/tokens";
import { shouldApplyPayment } from "@/lib/payments/paystack";
import { quoteCart } from "@/lib/commerce/quote-cart";
import { commitStock, releaseStock, reserveStock } from "@/lib/commerce/stock";
import { rememberOrder } from "@/lib/current-user";

export function paystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export function sandboxAllowed() {
  return process.env.ALLOW_PAYMENT_SANDBOX === "true";
}

export async function initializePaystack(input: { email: string; amountPesewas: number; reference: string; currency: string }) {
  if (!paystackConfigured()) return { configured: false as const };
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountPesewas,
      currency: input.currency,
      reference: input.reference,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout/return?reference=${input.reference}`,
      channels: ["card", "mobile_money"],
    }),
  });
  const payload = (await response.json().catch(() => null)) as { status?: boolean; data?: { authorization_url?: string } } | null;
  if (!response.ok || !payload?.status || !payload.data?.authorization_url) {
    return { configured: true as const, ok: false as const, message: "Paystack did not start the payment. No money was collected." };
  }
  return { configured: true as const, ok: true as const, authorizationUrl: payload.data.authorization_url };
}

function money(pesewas: number) {
  return pesewasToDecimal(pesewas);
}

export async function placeOrder(input: {
  idempotencyKey: string;
  userId: string | null;
  guestKey: string | null;
  customer: { name: string; email: string; phone: string; note?: string };
  address: { fullName: string; phone: string; line1: string; line2?: string; city: string; region: string; ghanaPostGps?: string; postalCode?: string; instructions?: string; country: string };
  methodCode: string;
  paymentChoice: "PAYSTACK" | "CASH_ON_DELIVERY" | "SANDBOX";
}) {
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(input.idempotencyKey)) return { ok: false as const, message: "The checkout session is invalid. Refresh and try again." };
  const existingKey = await prisma.idempotencyKey.findUnique({ where: { key: input.idempotencyKey } });
  if (existingKey?.orderId) {
    const existing = await prisma.order.findUnique({ where: { id: existingKey.orderId } });
    if (existing && (existing.userId === input.userId || existing.email === input.customer.email)) {
      return { ok: true as const, orderId: existing.id, number: existing.number, paymentMethod: existing.paymentMethod, replay: true as const };
    }
  }

  const quoted = await quoteCart({
    userId: input.userId,
    guestKey: input.guestKey,
    region: input.address.region,
    methodCode: input.methodCode,
    couponCode: undefined,
  });
  if ("error" in quoted) return { ok: false as const, message: quoted.error };
  if (!quoted.quote.valid || quoted.lines.length === 0) return { ok: false as const, message: quoted.quote.errors[0] ?? "The cart cannot be checked out." };
  if (input.paymentChoice === "CASH_ON_DELIVERY" && !quoted.codAllowed) return { ok: false as const, message: "Cash on delivery is not available for this region." };
  if (input.paymentChoice === "PAYSTACK" && !paystackConfigured()) return { ok: false as const, message: "Paystack is not configured. No payment was attempted." };
  if (input.paymentChoice === "SANDBOX" && !sandboxAllowed()) return { ok: false as const, message: "The development payment sandbox is turned off." };
  const method = quoted.methods.find((item) => item.code === input.methodCode);
  if (!method) return { ok: false as const, message: "Choose a delivery method that is available for this address." };

  const site = await prisma.siteConfiguration.findUnique({ where: { id: "default" } });
  if (!site) return { ok: false as const, message: "The marketplace is not configured yet." };
  const expiresAt = new Date(Date.now() + site.reservationMinutes * 60 * 1000);
  const reference = `lzre_${randomBytes(8).toString("hex")}`;
  const cod = input.paymentChoice === "CASH_ON_DELIVERY";

  const created = await prisma.$transaction(async (tx) => {
    for (const line of quoted.lines) {
      const held = await reserveStock(tx, line.variantId, line.quantity);
      if (!held) throw new Error(`${line.name} does not have enough stock.`);
      if (cod) {
        const committed = await commitStock(tx, line.variantId, line.quantity, input.userId ?? undefined);
        if (!committed) throw new Error(`${line.name} could not be reserved.`);
      }
    }

    let number = formatOrderNumber(new Date(), randomOrderSuffix());
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const clash = await tx.order.findUnique({ where: { number } });
      if (!clash) break;
      number = formatOrderNumber(new Date(), randomOrderSuffix());
    }

    const order = await tx.order.create({
      data: {
        number,
        userId: input.userId,
        email: input.customer.email,
        phone: input.customer.phone,
        customerName: input.customer.name,
        status: cod ? "CONFIRMED" : "PENDING_PAYMENT",
        paymentStatus: cod ? "COD_PENDING" : "PENDING",
        paymentMethod: input.paymentChoice,
        currency: quoted.currency,
        merchandiseSubtotal: money(quoted.quote.merchandise),
        discountTotal: money(quoted.quote.discount),
        shippingTotal: money(quoted.quote.shipping),
        taxTotal: money(quoted.quote.tax),
        grandTotal: money(quoted.quote.grand),
        couponCode: quoted.quote.discount > 0 || quoted.quote.freeShipping ? quoted.couponCode : null,
        taxBreakdown: quoted.quote.lines.map((line) => ({ key: line.key, tax: line.tax })),
        shippingAddress: input.address,
        deliveryMethodCode: method.code,
        deliveryMethodName: method.name,
        customerNote: input.customer.note || null,
        idempotencyKey: input.idempotencyKey,
      },
    });

    const sellerOrderIds = new Map<string, string>();
    for (const [index, seller] of quoted.quote.sellers.entries()) {
      const sellerOrder = await tx.sellerOrder.create({
        data: {
          orderId: order.id,
          sellerId: seller.sellerId,
          number: `${number}-${index + 1}`,
          status: cod ? "CONFIRMED" : "PENDING",
          merchandiseSubtotal: money(seller.merchandise),
          discountTotal: money(seller.discount),
          shippingTotal: money(seller.shipping),
          commissionRate: seller.ratePercent,
          commissionAmount: money(cod ? seller.commission : 0),
          sellerNet: money(cod ? seller.net : 0),
          currency: quoted.currency,
        },
      });
      sellerOrderIds.set(seller.sellerId, sellerOrder.id);
      if (cod && (seller.commission > 0 || seller.payable > 0)) {
        await tx.commission.create({
          data: {
            sellerOrderId: sellerOrder.id,
            sellerId: seller.sellerId,
            orderId: order.id,
            rate: seller.ratePercent,
            baseAmount: money(seller.merchandise - seller.discount),
            amount: money(seller.commission),
            currency: quoted.currency,
          },
        });
      }
    }

    for (const line of quoted.quote.lines) {
      const source = quoted.lines.find((item) => item.key === line.key)!;
      const sellerOrderId = sellerOrderIds.get(line.sellerId)!;
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          sellerOrderId,
          productId: source.productId,
          variantId: line.variantId,
          sellerId: line.sellerId,
          name: source.name,
          sku: source.sku,
          variantName: source.variantName,
          quantity: line.quantity,
          unitPrice: money(line.unitPrice),
          discount: money(line.discount),
          tax: money(line.tax),
          lineTotal: money(line.merchandiseAfterDiscount),
          currency: quoted.currency,
        },
      });
      await tx.stockReservation.create({
        data: {
          variantId: line.variantId,
          orderId: order.id,
          quantity: line.quantity,
          expiresAt,
          committedAt: cod ? new Date() : null,
        },
      });
    }

    await tx.payment.create({
      data: {
        orderId: order.id,
        provider: input.paymentChoice === "PAYSTACK" ? "paystack" : input.paymentChoice === "CASH_ON_DELIVERY" ? "cod" : "sandbox",
        method: input.paymentChoice,
        status: cod ? "COD_PENDING" : "PENDING",
        amount: money(quoted.quote.grand),
        currency: quoted.currency,
        reference,
        simulated: false,
      },
    });

    if (cod) {
      for (const entry of saleLedger(quoted.quote.sellers.map((seller) => ({ sellerId: seller.sellerId, commission: seller.commission, payable: seller.payable })), "COD_RECEIVABLE")) {
        await tx.ledgerEntry.create({
          data: { orderId: order.id, sellerId: entry.sellerId, account: entry.account, direction: entry.direction, amount: money(entry.amount), currency: quoted.currency, memo: entry.memo },
        });
      }
    }

    if (quoted.couponCode && (quoted.quote.discount > 0 || quoted.quote.freeShipping)) {
      const coupon = await tx.coupon.findUnique({ where: { code: quoted.couponCode } });
      if (coupon) {
        await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
        await tx.couponRedemption.create({ data: { couponId: coupon.id, userId: input.userId, orderId: order.id, email: input.customer.email } });
      }
    }

    await tx.idempotencyKey.create({ data: { key: input.idempotencyKey, scope: "checkout", orderId: order.id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    if (quoted.cartId) await tx.cartItem.deleteMany({ where: { cartId: quoted.cartId, savedForLater: false } });
    return order;
  });

  await rememberOrder(created.id);
  if (input.userId) {
    await notifyUser(input.userId, {
      type: "ORDER",
      title: `Order ${created.number} placed`,
      body: cod ? "Cash on delivery was selected. Payment is still outstanding." : "Payment has not been confirmed yet.",
      href: `/account/orders/${created.id}`,
    });
  }
  const sellers = await prisma.sellerOrder.findMany({ where: { orderId: created.id }, include: { seller: true } });
  for (const sellerOrder of sellers) {
    await notifyUser(sellerOrder.seller.userId, { type: "ORDER", title: `New order ${sellerOrder.number}`, body: "A customer placed an order that includes your products.", href: `/seller/orders/${sellerOrder.id}` });
  }
  const email = await sendEmail({
    to: input.customer.email,
    template: "order-placed",
    subject: `LZRE order ${created.number}`,
    body: cod
      ? `Order ${created.number} is confirmed for cash on delivery. Pay the courier when the parcel arrives. This is not a card receipt.`
      : `Order ${created.number} is waiting for payment. It is not paid yet.`,
  });

  if (input.paymentChoice === "PAYSTACK") {
    const started = await initializePaystack({ email: input.customer.email, amountPesewas: quoted.quote.grand, reference, currency: quoted.currency });
    if (!started.configured || !started.ok) {
      return { ok: true as const, orderId: created.id, number: created.number, paymentMethod: created.paymentMethod, replay: false as const, next: `/checkout/pay/${created.id}`, notice: "message" in started ? started.message : "Paystack is not configured.", email: email.detail };
    }
    return { ok: true as const, orderId: created.id, number: created.number, paymentMethod: created.paymentMethod, replay: false as const, next: started.authorizationUrl, email: email.detail };
  }

  return {
    ok: true as const,
    orderId: created.id,
    number: created.number,
    paymentMethod: created.paymentMethod,
    replay: false as const,
    next: input.paymentChoice === "SANDBOX" ? `/checkout/pay/${created.id}` : `/checkout/confirmation/${created.id}`,
    email: email.detail,
  };
}

export async function markOrderPaid(reference: string) {
  const payment = await prisma.payment.findUnique({ where: { reference }, include: { order: { include: { sellerOrders: true, reservations: true } } } });
  if (!payment) return { ok: false as const, message: "Payment was not found." };
  if (!shouldApplyPayment(payment.status)) return { ok: true as const, duplicate: true as const };
  if (!canTransitionOrder(payment.order.status, "PAID", { paymentVerified: true })) return { ok: false as const, message: "The order cannot be marked paid from its current status." };

  await prisma.$transaction(async (tx) => {
    const current = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!current || !shouldApplyPayment(current.status)) return;
    for (const reservation of payment.order.reservations) {
      if (reservation.committedAt || reservation.releasedAt) continue;
      const committed = await commitStock(tx, reservation.variantId, reservation.quantity);
      if (!committed) throw new Error("Reserved stock could not be committed.");
      await tx.stockReservation.update({ where: { id: reservation.id }, data: { committedAt: new Date() } });
    }
    await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", providerRef: reference } });
    await tx.order.update({ where: { id: payment.orderId }, data: { status: "PAID", paymentStatus: "PAID" } });
    await tx.sellerOrder.updateMany({ where: { orderId: payment.orderId, status: "PENDING" }, data: { status: "CONFIRMED" } });
    const sellerOrders = await tx.sellerOrder.findMany({ where: { orderId: payment.orderId } });
    const ledgerSellers = [];
    for (const sellerOrder of sellerOrders) {
      const base = cedisToPesewas(sellerOrder.merchandiseSubtotal.toString()) - cedisToPesewas(sellerOrder.discountTotal.toString());
      const commission = Math.round((base * Number(sellerOrder.commissionRate)) / 100);
      const shipping = cedisToPesewas(sellerOrder.shippingTotal.toString());
      const payable = base - commission + shipping;
      await tx.sellerOrder.update({ where: { id: sellerOrder.id }, data: { commissionAmount: money(commission), sellerNet: money(base - commission) } });
      const existingCommission = await tx.commission.findUnique({ where: { sellerOrderId: sellerOrder.id } });
      if (!existingCommission) {
        await tx.commission.create({
          data: { sellerOrderId: sellerOrder.id, sellerId: sellerOrder.sellerId, orderId: payment.orderId, rate: sellerOrder.commissionRate, baseAmount: money(base), amount: money(commission), currency: payment.currency },
        });
      }
      ledgerSellers.push({ sellerId: sellerOrder.sellerId, commission, payable });
    }
    for (const entry of saleLedger(ledgerSellers, "CASH")) {
      await tx.ledgerEntry.create({ data: { orderId: payment.orderId, sellerId: entry.sellerId, account: entry.account, direction: entry.direction, amount: money(entry.amount), currency: payment.currency, memo: entry.memo } });
    }
  });

  if (payment.order.userId) {
    await notifyUser(payment.order.userId, { type: "PAYMENT", title: `Payment received for ${payment.order.number}`, body: "Paystack confirmed this payment.", href: `/account/orders/${payment.order.id}` });
  }
  await sendEmail({ to: payment.order.email, template: "payment-confirmed", subject: `Payment confirmed ${payment.order.number}`, body: `Paystack confirmed payment for order ${payment.order.number}.` });
  return { ok: true as const, duplicate: false as const };
}

export async function settleSandbox(orderId: string, success: boolean) {
  if (!sandboxAllowed()) return { ok: false as const, message: "The development payment sandbox is turned off." };
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: true, reservations: true } });
  if (!order || order.paymentMethod !== "SANDBOX") return { ok: false as const, message: "This order is not using the development sandbox." };
  const payment = order.payments[0];
  if (!payment) return { ok: false as const, message: "This order has no payment record." };
  if (payment.status === "SIMULATED") return { ok: true as const, message: "This sandbox payment was already recorded. It is not a real payment." };
  if (!success) {
    await releaseOrderStock(order.id);
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: "Sandbox failure selected" } });
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED", paymentStatus: "FAILED" } });
    return { ok: true as const, message: "The sandbox payment was marked failed. No money was collected." };
  }
  if (!canTransitionOrder(order.status, "PROCESSING", { simulated: true })) return { ok: false as const, message: "This order can no longer be updated." };
  await prisma.$transaction(async (tx) => {
    for (const reservation of order.reservations) {
      if (reservation.committedAt || reservation.releasedAt) continue;
      const committed = await commitStock(tx, reservation.variantId, reservation.quantity, undefined, false);
      if (!committed) throw new Error("Stock could not be updated.");
      await tx.stockReservation.update({ where: { id: reservation.id }, data: { committedAt: new Date() } });
    }
    await tx.payment.update({ where: { id: payment.id }, data: { status: "SIMULATED", simulated: true } });
    await tx.order.update({ where: { id: order.id }, data: { status: "PROCESSING", paymentStatus: "SIMULATED" } });
  });
  return { ok: true as const, message: "Sandbox payment recorded. No money was collected and the order is not marked paid." };
}

export async function releaseOrderStock(orderId: string) {
  const reservations = await prisma.stockReservation.findMany({ where: { orderId, committedAt: null, releasedAt: null } });
  await prisma.$transaction(async (tx) => {
    for (const reservation of reservations) {
      await releaseStock(tx, reservation.variantId, reservation.quantity);
      await tx.stockReservation.update({ where: { id: reservation.id }, data: { releasedAt: new Date() } });
    }
  });
}

export async function collectCod(sellerOrderId: string, actorId: string) {
  const sellerOrder = await prisma.sellerOrder.findUnique({ where: { id: sellerOrderId }, include: { order: true } });
  if (!sellerOrder) return { ok: false as const, message: "Order not found." };
  if (sellerOrder.order.paymentMethod !== "CASH_ON_DELIVERY" || sellerOrder.order.paymentStatus !== "COD_PENDING") {
    return { ok: false as const, message: "Cash has not been recorded because this order is not waiting for collection." };
  }
  const amount = cedisToPesewas(sellerOrder.order.grandTotal.toString());
  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: sellerOrder.orderId }, data: { paymentStatus: "COD_COLLECTED" } });
    await tx.payment.updateMany({ where: { orderId: sellerOrder.orderId, status: "COD_PENDING" }, data: { status: "COD_COLLECTED" } });
    await tx.ledgerEntry.createMany({
      data: [
        { orderId: sellerOrder.orderId, account: "CASH", direction: "DEBIT", amount: money(amount), currency: sellerOrder.currency, memo: "Cash collected on delivery" },
        { orderId: sellerOrder.orderId, account: "COD_RECEIVABLE", direction: "CREDIT", amount: money(amount), currency: sellerOrder.currency, memo: "Cash on delivery collected" },
      ],
    });
  });
  await audit(actorId, "cod.collected", "Order", sellerOrder.orderId);
  return { ok: true as const, message: "Cash collection was recorded." };
}
