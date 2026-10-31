import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const metadata = { title: "Seller orders" };

export default async function SellerOrdersPage() {
  const user = await getCurrentUser();
  const orders = await prisma.sellerOrder.findMany({ where: { sellerId: user?.sellerProfile?.id }, include: { order: true }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Orders</h1>
      {orders.map((order) => (
        <Link className="mt-4 block border-b border-line py-3" href={`/seller/orders/${order.id}`} key={order.id}>
          {order.number} · {order.status} · payment {order.order.paymentStatus}
          {order.order.paymentStatus === "SIMULATED" ? " · simulated, excluded from payouts" : ""}
        </Link>
      ))}
    </div>
  );
}
