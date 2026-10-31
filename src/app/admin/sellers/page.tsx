import { decideSellerAction, recordPayoutAction, setCommissionAction } from "@/actions/admin";
import { prisma } from "@/lib/db";

export const metadata = { title: "Sellers" };

export default async function AdminSellersPage() {
  const sellers = await prisma.sellerProfile.findMany({ include: { user: true, store: true }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Sellers</h1>
      {sellers.map((seller) => (
        <article className="mt-6 border-b border-line pb-4" key={seller.id}>
          <p className="font-medium">{seller.store?.name ?? seller.legalName} · {seller.status}</p>
          <p className="text-sm text-muted">{seller.user.email} · {seller.businessType}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <form action={decideSellerAction}><input name="id" type="hidden" value={seller.id} /><input name="decision" type="hidden" value="approve" /><button type="submit">Approve</button></form>
            <form action={decideSellerAction}><input name="id" type="hidden" value={seller.id} /><input name="decision" type="hidden" value="suspend" /><button type="submit">Suspend</button></form>
            <form action={decideSellerAction}><input name="id" type="hidden" value={seller.id} /><input name="decision" type="hidden" value="reinstate" /><button type="submit">Reinstate</button></form>
          </div>
          <form action={setCommissionAction} className="mt-2 flex gap-2">
            <input name="id" type="hidden" value={seller.id} />
            <input className="h-11 w-24 border border-line px-2" name="rate" placeholder="%" defaultValue={seller.commissionRate?.toString() ?? ""} />
            <button type="submit">Set commission</button>
          </form>
          <form action={recordPayoutAction} className="mt-2 flex gap-2">
            <input name="sellerId" type="hidden" value={seller.id} />
            <input className="h-11 w-32 border border-line px-2" name="amount" placeholder="Amount" />
            <button type="submit">Record payout</button>
          </form>
        </article>
      ))}
    </div>
  );
}
