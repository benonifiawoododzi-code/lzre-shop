import { notFound } from "next/navigation";
import { recordOfflineRefundAction } from "@/actions/admin";
import { prisma } from "@/lib/db";

export const metadata = { title: "Admin order" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true, payments: true, sellerOrders: true, refunds: true } });
  if (!order) notFound();
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">{order.number}</h1>
      <p className="mt-2">{order.status} · {order.paymentStatus} · {order.paymentMethod}</p>
      {order.items.map((item) => <p className="mt-2" key={item.id}>{item.quantity} × {item.name}</p>)}
      <form action={recordOfflineRefundAction} className="mt-6 grid max-w-md gap-2">
        <h2 className="font-display text-2xl">Offline refund</h2>
        <p className="text-sm text-muted">Only record this after the money has actually been returned outside Paystack.</p>
        <input name="orderId" type="hidden" value={order.id} />
        <input className="h-11 border border-line px-2" name="amount" placeholder="Refund amount" required />
        <input className="h-11 border border-line px-2" name="commission" placeholder="Commission to reverse" required />
        <input className="h-11 border border-line px-2" name="reason" placeholder="Reason" required />
        <label className="flex gap-2"><input name="confirm" required type="checkbox" value="yes" /> I confirm this refund was paid outside the gateway.</label>
        <button type="submit">Record offline refund</button>
      </form>
    </div>
  );
}
