import { notFound } from "next/navigation";
import { sellerCollectCodAction, updateFulfillmentAction } from "@/actions/seller";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const metadata = { title: "Seller order" };

export default async function SellerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const order = await prisma.sellerOrder.findFirst({ where: { id, sellerId: user?.sellerProfile?.id }, include: { items: true, order: true, shipment: true } });
  if (!order) notFound();
  const address = order.order.shippingAddress as { fullName?: string; phone?: string; line1?: string; city?: string; region?: string };
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">{order.number}</h1>
      {order.order.paymentStatus === "SIMULATED" ? <p className="mt-2 text-warning">Simulated payment. Do not treat this as collected money.</p> : null}
      <p className="mt-3">{address.fullName} · {address.phone}</p>
      <p>{address.line1}, {address.city}, {address.region}</p>
      {order.items.map((item) => <p className="mt-2" key={item.id}>{item.quantity} × {item.name}</p>)}
      <form action={updateFulfillmentAction} className="mt-6 grid max-w-md gap-2">
        <input name="id" type="hidden" value={order.id} />
        <select className="h-11 border border-line" name="status" defaultValue={order.status}>
          {["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].map((status) => <option key={status}>{status}</option>)}
        </select>
        <input className="h-11 border border-line px-2" name="carrier" placeholder="Carrier name, if you have one" />
        <input className="h-11 border border-line px-2" name="trackingNumber" placeholder="Tracking number" />
        <button className="h-11 bg-navy text-ivory" type="submit">Update fulfillment</button>
      </form>
      <p className="mt-3 text-sm text-muted">Tracking numbers are stored as text. LZRE does not contact a courier.</p>
      {order.order.paymentMethod === "CASH_ON_DELIVERY" && order.order.paymentStatus === "COD_PENDING" ? (
        <form action={sellerCollectCodAction} className="mt-4"><input name="id" type="hidden" value={order.id} /><button type="submit">Record full cash collection</button></form>
      ) : null}
    </div>
  );
}
