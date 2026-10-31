import Link from "next/link";
import { notFound } from "next/navigation";
import { sandboxPaymentAction } from "@/actions/checkout";
import { hasOrderReceipt } from "@/lib/current-user";
import { getCurrentUser } from "@/lib/current-user";
import { sandboxAllowed } from "@/lib/commerce/checkout";
import { prisma } from "@/lib/db";

export const metadata = { title: "Payment", robots: { index: false, follow: false } };

export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const [user, receipt] = await Promise.all([getCurrentUser(), hasOrderReceipt(orderId)]);
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order || (order.userId !== user?.id && !receipt && !user?.roles.includes("ADMIN"))) notFound();
  const payment = order.payments[0];
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-display text-4xl text-navy">Payment for {order.number}</h1>
      <p className="mt-4">Status: {order.paymentStatus}. This page never marks an order paid by itself.</p>
      {order.paymentMethod === "SANDBOX" && payment?.status === "PENDING" && sandboxAllowed() ? (
        <div className="mt-6 grid gap-3">
          <p>Development sandbox. Choosing an outcome does not collect money and does not create a paid order.</p>
          <form action={sandboxPaymentAction.bind(null, order.id, true)}><button className="h-11 bg-navy px-4 text-ivory" type="submit">Record simulated success</button></form>
          <form action={sandboxPaymentAction.bind(null, order.id, false)}><button className="h-11 border border-danger px-4 text-danger" type="submit">Record simulated failure</button></form>
        </div>
      ) : null}
      {order.paymentMethod === "PAYSTACK" ? <p className="mt-4">If Paystack did not open, the payment was not confirmed. Wait for the webhook or return to checkout support.</p> : null}
      <Link className="mt-6 inline-block" href={`/checkout/confirmation/${order.id}`}>View order</Link>
    </div>
  );
}
