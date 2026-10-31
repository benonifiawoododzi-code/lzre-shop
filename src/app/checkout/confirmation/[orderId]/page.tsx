import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, hasOrderReceipt } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { formatMoney, cedisToPesewas } from "@/lib/pricing/money";

export const metadata = { title: "Order confirmation", robots: { index: false, follow: false } };

export default async function ConfirmationPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const [user, receipt] = await Promise.all([getCurrentUser(), hasOrderReceipt(orderId)]);
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, sellerOrders: true, payments: true } });
  if (!order || (order.userId !== user?.id && !receipt && !user?.roles.includes("ADMIN"))) notFound();
  const paid = order.paymentStatus === "PAID" || order.paymentStatus === "COD_COLLECTED";
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl text-navy">Order {order.number}</h1>
      <p className="mt-3">{paid ? "Payment is recorded." : order.paymentStatus === "SIMULATED" ? "Sandbox payment recorded. No money was collected and this order is not paid." : order.paymentMethod === "CASH_ON_DELIVERY" ? "Placed for cash on delivery. Payment is still outstanding." : "Payment has not been confirmed."}</p>
      <p className="mt-2 text-sm text-muted">Email is sent only when an email provider is configured. Otherwise the message is stored and not delivered.</p>
      <ul className="mt-6 grid gap-2">
        {order.items.map((item) => <li key={item.id}>{item.quantity} × {item.name} · {item.variantName}</li>)}
      </ul>
      <p className="mt-4 font-semibold">{formatMoney(cedisToPesewas(order.grandTotal.toString()), order.currency)}</p>
      <Link className="mt-6 inline-block underline" href={user ? `/account/orders/${order.id}` : "/"}>Continue</Link>
    </div>
  );
}
