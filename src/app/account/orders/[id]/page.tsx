import Link from "next/link";
import { notFound } from "next/navigation";
import { requestCancellationAction, requestReturnAction } from "@/actions/account";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { cedisToPesewas, formatMoney } from "@/lib/pricing/money";

export const metadata = { title: "Order", robots: { index: false, follow: false } };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: { items: true, sellerOrders: { include: { shipment: true } }, payments: true },
  });
  if (!order) notFound();
  const address = order.shippingAddress as { line1?: string; city?: string; region?: string };
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">{order.number}</h1>
      <p className="mt-2">{order.status} · {order.paymentStatus}</p>
      <p className="mt-2 text-sm text-muted">Carrier tracking is not connected. Status changes come from the seller.</p>
      <p className="mt-4">{address.line1}, {address.city}, {address.region}</p>
      <p className="mt-2">{order.deliveryMethodName}</p>
      {order.items.map((item) => (
        <div className="mt-4 border-b border-line py-3" key={item.id}>
          <p>{item.quantity} × {item.name}</p>
          {order.status === "DELIVERED" ? (
            <form action={requestReturnAction} className="mt-2 grid gap-2">
              <input name="orderItemId" type="hidden" value={item.id} />
              <select className="h-11 border border-line" name="reason"><option>DAMAGED</option><option>WRONG_ITEM</option><option>NOT_AS_DESCRIBED</option><option>CHANGED_MIND</option><option>OTHER</option></select>
              <textarea className="border border-line p-2" name="description" placeholder="What happened?" required />
              <button type="submit">Request return</button>
            </form>
          ) : null}
        </div>
      ))}
      {order.sellerOrders.map((sellerOrder) => (
        <section className="mt-4" key={sellerOrder.id}>
          <p className="text-sm">{sellerOrder.number}: {sellerOrder.status}</p>
          {sellerOrder.shipment?.trackingNumber ? <p className="text-sm">Tracking number {sellerOrder.shipment.trackingNumber}. No live map is available.</p> : null}
          {["PENDING", "CONFIRMED", "PACKED"].includes(sellerOrder.status) ? (
            <form action={requestCancellationAction} className="mt-2 flex gap-2">
              <input name="sellerOrderId" type="hidden" value={sellerOrder.id} />
              <input className="h-11 flex-1 border border-line px-2" name="reason" placeholder="Cancellation reason" required />
              <button type="submit">Request cancellation</button>
            </form>
          ) : null}
        </section>
      ))}
      <p className="mt-4 font-semibold">{formatMoney(cedisToPesewas(order.grandTotal.toString()), order.currency)}</p>
      <Link className="mt-4 inline-block" href={`/account/orders/${order.id}/receipt`}>Receipt</Link>
    </div>
  );
}
