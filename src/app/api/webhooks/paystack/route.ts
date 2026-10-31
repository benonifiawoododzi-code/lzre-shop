import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { log } from "@/lib/log";
import { markOrderPaid } from "@/lib/commerce/checkout";
import { interpretPaystackCharge, paystackEventId, verifyPaystackSignature } from "@/lib/payments/paystack";
import { createHash } from "crypto";
import { cedisToPesewas } from "@/lib/pricing/money";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  const secret = process.env.PAYSTACK_SECRET_KEY ?? "";
  const signatureOk = verifyPaystackSignature(raw, signature, secret);
  let body: unknown = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const event = body as Parameters<typeof interpretPaystackCharge>[0];
  const eventId = paystackEventId(event) ?? createHash("sha256").update(raw).digest("hex");
  const existing = await prisma.webhookEvent.findUnique({ where: { provider_eventId: { provider: "paystack", eventId } } });
  if (existing?.processedAt) return NextResponse.json({ ok: true, duplicate: true });
  if (!existing) {
    await prisma.webhookEvent.create({ data: { provider: "paystack", eventId, signatureOk } });
  }
  if (!signatureOk) {
    log("warn", "paystack.signature_rejected", { eventId });
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (event.data?.reference) {
    const payment = await prisma.payment.findUnique({ where: { reference: event.data.reference } });
    if (payment) {
      const decision = interpretPaystackCharge(event, {
        reference: payment.reference,
        amountPesewas: cedisToPesewas(payment.amount.toString()),
        currency: payment.currency,
      });
      if (decision.action === "mark_paid") await markOrderPaid(payment.reference);
      if (decision.action === "reject") {
        await prisma.webhookEvent.update({ where: { provider_eventId: { provider: "paystack", eventId } }, data: { error: decision.reason } });
        return NextResponse.json({ ok: false }, { status: 400 });
      }
    }
  }
  await prisma.webhookEvent.update({ where: { provider_eventId: { provider: "paystack", eventId } }, data: { processedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
