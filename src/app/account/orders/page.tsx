import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { cedisToPesewas, formatMoney } from "@/lib/pricing/money";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const orders = await prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { sellerOrders: true } });
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Orders</h1>
      {orders.length === 0 ? <p className="mt-4 text-muted">No orders yet.</p> : null}
      <div className="mt-6 grid gap-4">
        {orders.map((order) => (
          <Link className="border-b border-line py-3" href={`/account/orders/${order.id}`} key={order.id}>
            <span className="font-medium">{order.number}</span>
            <span className="mt-1 block text-sm text-muted">{order.status} · payment {order.paymentStatus} · {formatMoney(cedisToPesewas(order.grandTotal.toString()), order.currency)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
