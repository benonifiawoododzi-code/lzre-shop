import { brandDefaults } from "@/config/site";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { cedisToPesewas, formatMoney } from "@/lib/pricing/money";

export const metadata = { title: "Seller dashboard" };

export default async function SellerDashboardPage() {
  const user = await getCurrentUser();
  const sellerId = user?.sellerProfile?.id;
  if (!sellerId) return null;
  const [orders, products, pending, low] = await Promise.all([
    prisma.sellerOrder.findMany({ where: { sellerId }, include: { order: true } }),
    prisma.product.count({ where: { sellerId, deletedAt: null } }),
    prisma.sellerOrder.count({ where: { sellerId, status: { in: ["PENDING", "CONFIRMED"] } } }),
    prisma.inventory.count({ where: { available: { lte: 5 }, variant: { product: { sellerId } } } }),
  ]);
  const site = await prisma.siteConfiguration.findUnique({ where: { id: "default" } });
  const currency = site?.currency ?? brandDefaults.currency;
  const real = orders.filter((order) => ["PAID", "COD_PENDING", "COD_COLLECTED"].includes(order.order.paymentStatus));
  const sales = real.reduce((sum, order) => sum + cedisToPesewas(order.merchandiseSubtotal.toString()) - cedisToPesewas(order.discountTotal.toString()), 0);
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Seller dashboard</h1>
      <p className="mt-2 text-sm text-muted">Figures come from your orders. Simulated payments are excluded.</p>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div><dt>Merchandise sales</dt><dd className="font-display text-3xl">{formatMoney(sales, currency)}</dd></div>
        <div><dt>Orders</dt><dd className="font-display text-3xl">{real.length}</dd></div>
        <div><dt>Pending fulfillment</dt><dd className="font-display text-3xl">{pending}</dd></div>
        <div><dt>Products</dt><dd className="font-display text-3xl">{products}</dd></div>
        <div><dt>Low stock variants</dt><dd className="font-display text-3xl">{low}</dd></div>
      </dl>
    </div>
  );
}
