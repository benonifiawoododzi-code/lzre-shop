import { brandDefaults } from "@/config/site";
import { prisma } from "@/lib/db";
import { cedisToPesewas, formatMoney } from "@/lib/pricing/money";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const [customers, sellers, products, orders, applications, pendingProducts, refunds, lowStock, paid, commission] = await Promise.all([
    prisma.user.count({ where: { roles: { has: "CUSTOMER" }, deletedAt: null } }),
    prisma.sellerProfile.count({ where: { status: "APPROVED" } }),
    prisma.product.count({ where: { status: "APPROVED", deletedAt: null } }),
    prisma.order.count(),
    prisma.sellerProfile.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.refund.count({ where: { status: { in: ["REQUESTED", "PROCESSING"] } } }),
    prisma.inventory.count({ where: { available: { lte: 5 } } }),
    prisma.order.findMany({ where: { status: { not: "CANCELLED" }, paymentStatus: { in: ["PAID", "COD_PENDING", "COD_COLLECTED"] } }, select: { grandTotal: true, currency: true } }),
    prisma.ledgerEntry.findMany({ where: { account: "COMMISSION_REVENUE" } }),
  ]);
  const currency = paid[0]?.currency ?? brandDefaults.currency;
  const gmv = paid.reduce((sum, order) => sum + cedisToPesewas(order.grandTotal.toString()), 0);
  const revenue = commission.reduce((sum, entry) => sum + (entry.direction === "CREDIT" ? 1 : -1) * cedisToPesewas(entry.amount.toString()), 0);
  const pendingOrders = await prisma.order.count({ where: { status: { in: ["PENDING_PAYMENT", "PROCESSING", "CONFIRMED"] } } });
  const cards = [
    ["Customers", customers],
    ["Sellers", sellers],
    ["Products", products],
    ["Orders", orders],
    ["GMV", formatMoney(gmv, currency)],
    ["Commission", formatMoney(revenue, currency)],
    ["Seller applications", applications],
    ["Product reviews", pendingProducts],
    ["Open orders", pendingOrders],
    ["Open refunds", refunds],
    ["Low stock", lowStock],
  ];
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Marketplace</h1>
      <p className="mt-2 text-sm text-muted">Counts are live database aggregates. Simulated payments are excluded from GMV.</p>
      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map(([label, value]) => <div key={String(label)}><dt className="text-sm text-muted">{label}</dt><dd className="font-display text-3xl">{value}</dd></div>)}
      </dl>
    </div>
  );
}
