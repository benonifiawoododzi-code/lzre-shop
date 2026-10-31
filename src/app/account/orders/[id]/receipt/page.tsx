import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { cedisToPesewas, formatMoney } from "@/lib/pricing/money";

export const metadata = { title: "Receipt", robots: { index: false, follow: false } };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const order = await prisma.order.findFirst({ where: { id, userId: user?.id }, include: { items: true } });
  if (!order || !user) notFound();
  return (
    <article className="bg-paper p-6">
      <h1 className="font-display text-3xl">Receipt {order.number}</h1>
      <p className="mt-2 text-sm">Payment status: {order.paymentStatus}. This receipt does not claim a payment that has not been recorded.</p>
      <table className="mt-6 w-full text-sm">
        <tbody>
          {order.items.map((item) => (
            <tr className="border-b border-line" key={item.id}>
              <td className="py-2">{item.name}</td>
              <td>{item.quantity}</td>
              <td>{formatMoney(cedisToPesewas(item.lineTotal.toString()), order.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 font-semibold">Total {formatMoney(cedisToPesewas(order.grandTotal.toString()), order.currency)}</p>
    </article>
  );
}
