import Link from "next/link";
import { prisma } from "@/lib/db";

export const metadata = { title: "Admin orders" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams;
  const orders = await prisma.order.findMany({
    where: {
      number: q ? { contains: q, mode: "insensitive" } : undefined,
      status: status ? status as "PAID" : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Orders</h1>
      <form className="mt-4 flex gap-2"><input className="h-11 border border-line px-2" name="q" placeholder="Order number" /><button type="submit">Search</button></form>
      {orders.map((order) => <Link className="mt-3 block border-b border-line py-2" href={`/admin/orders/${order.id}`} key={order.id}>{order.number} · {order.status} · {order.paymentStatus}</Link>)}
    </div>
  );
}
