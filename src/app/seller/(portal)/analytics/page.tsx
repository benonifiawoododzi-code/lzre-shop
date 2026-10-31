import { brandDefaults } from "@/config/site";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { cedisToPesewas, formatMoney } from "@/lib/pricing/money";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = Number((await searchParams).days ?? 30);
  const windowDays = [7, 30, 90].includes(days) ? days : 30;
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - windowDays);
  const [user, site] = await Promise.all([getCurrentUser(), prisma.siteConfiguration.findUnique({ where: { id: "default" } })]);
  const currency = site?.currency ?? brandDefaults.currency;
  const orders = await prisma.sellerOrder.findMany({
    where: { sellerId: user?.sellerProfile?.id, createdAt: { gte: since }, order: { paymentStatus: { in: ["PAID", "COD_PENDING", "COD_COLLECTED"] } } },
  });
  const total = orders.reduce((sum, order) => sum + cedisToPesewas(order.merchandiseSubtotal.toString()) - cedisToPesewas(order.discountTotal.toString()), 0);
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Analytics</h1>
      <p className="mt-2 text-sm">Last {windowDays} days. Simulated orders are excluded.</p>
      <p className="mt-6 font-display text-3xl">{formatMoney(total, currency)}</p>
      <p>{orders.length} seller orders</p>
    </div>
  );
}
