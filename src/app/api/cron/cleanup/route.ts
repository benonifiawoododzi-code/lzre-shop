import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { releaseOrderStock } from "@/lib/commerce/checkout";

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const expired = await prisma.stockReservation.findMany({
    where: { expiresAt: { lt: new Date() }, releasedAt: null, committedAt: null },
    select: { orderId: true },
  });
  const orderIds = [...new Set(expired.map((row) => row.orderId).filter((id): id is string => Boolean(id)))];
  for (const orderId of orderIds) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "PENDING_PAYMENT") continue;
    await releaseOrderStock(orderId);
    await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED", paymentStatus: "CANCELLED" } });
    await prisma.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "CANCELLED" } });
  }
  return NextResponse.json({ ok: true, released: orderIds.length });
}
