import { prisma } from "@/lib/db";

export const metadata = { title: "Payment return", robots: { index: false, follow: false } };

export default async function PaymentReturnPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  const payment = reference ? await prisma.payment.findUnique({ where: { reference }, include: { order: true } }) : null;
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-display text-4xl text-navy">Returning from payment</h1>
      <p className="mt-4">Reaching this page does not mark an order as paid. LZRE waits for a verified Paystack webhook.</p>
      {payment ? <p className="mt-4">Order {payment.order.number}: {payment.status}.</p> : <p className="mt-4">No matching payment reference was found.</p>}
    </div>
  );
}
