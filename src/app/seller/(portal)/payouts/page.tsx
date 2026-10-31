import { brandDefaults } from "@/config/site";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { cedisToPesewas, formatMoney } from "@/lib/pricing/money";

export const metadata = { title: "Payouts" };

export default async function PayoutsPage() {
  const user = await getCurrentUser();
  const sellerId = user?.sellerProfile?.id;
  if (!sellerId) return null;
  const [entries, payouts, site] = await Promise.all([
    prisma.ledgerEntry.findMany({ where: { sellerId, account: "SELLER_PAYABLE" } }),
    prisma.payout.findMany({ where: { sellerId }, orderBy: { createdAt: "desc" } }),
    prisma.siteConfiguration.findUnique({ where: { id: "default" } }),
  ]);
  const currency = site?.currency ?? brandDefaults.currency;
  const balance = entries.reduce((sum, entry) => sum + (entry.direction === "CREDIT" ? 1 : -1) * cedisToPesewas(entry.amount.toString()), 0);
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Payouts</h1>
      <p className="mt-3">Pending balance from the ledger: {formatMoney(balance, currency)}</p>
      <p className="mt-2 text-sm text-muted">Paystack subaccount payouts run when a subaccount is configured. Until then, an administrator records a manual payout.</p>
      {payouts.map((payout) => <p className="mt-3 border-b border-line py-2" key={payout.id}>{payout.status} · {formatMoney(cedisToPesewas(payout.amount.toString()), payout.currency)} · {payout.note}</p>)}
    </div>
  );
}
