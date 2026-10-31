import { prisma } from "@/lib/db";

export const metadata = { title: "Shipping" };

export default async function AdminShippingPage() {
  const zones = await prisma.shippingZone.findMany({ include: { rates: { include: { method: true } } } });
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Shipping</h1>
      <p className="mt-2 text-sm text-muted">Seeded rates are demonstration values. Replace them before taking real orders.</p>
      {zones.map((zone) => (
        <section className="mt-6" key={zone.id}>
          <h2 className="font-display text-2xl">{zone.name}</h2>
          <p className="text-sm text-muted">{zone.note} Cash on delivery: {zone.codAllowed ? "allowed" : "not offered"}.</p>
          {zone.rates.map((rate) => <p className="mt-2" key={rate.id}>{rate.method.name}: {rate.price.toString()} {rate.currency}</p>)}
        </section>
      ))}
    </div>
  );
}
