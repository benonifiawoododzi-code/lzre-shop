import { saveCouponAction, savePromotionAction } from "@/actions/admin";
import { prisma } from "@/lib/db";

export const metadata = { title: "Promotions" };

export default async function AdminPromotionsPage() {
  const [coupons, promotions] = await Promise.all([prisma.coupon.findMany(), prisma.promotion.findMany({ orderBy: { createdAt: "desc" } })]);
  return (
    <div className="grid gap-8">
      <h1 className="font-display text-4xl text-navy">Promotions</h1>
      <form action={saveCouponAction} className="grid max-w-lg gap-2">
        <input className="h-11 border border-line px-2" name="code" placeholder="Code" required />
        <input className="h-11 border border-line px-2" name="description" placeholder="Description" required />
        <select className="h-11 border border-line" name="type"><option>PERCENTAGE</option><option>FIXED</option><option>FREE_SHIPPING</option></select>
        <input className="h-11 border border-line px-2" name="value" placeholder="Value" required />
        <button type="submit">Save coupon</button>
      </form>
      {coupons.map((coupon) => <p key={coupon.id}>{coupon.code} · {coupon.type} · used {coupon.usedCount}</p>)}
      <form action={savePromotionAction} className="grid max-w-lg gap-2">
        <select className="h-11 border border-line" name="placement"><option>HERO</option><option>BANNER</option><option>ANNOUNCEMENT</option></select>
        <input className="h-11 border border-line px-2" name="title" placeholder="Title" required />
        <input className="h-11 border border-line px-2" name="subtitle" placeholder="Subtitle" />
        <input className="h-11 border border-line px-2" name="ctaLabel" placeholder="Button label" />
        <input className="h-11 border border-line px-2" name="ctaHref" placeholder="/products" />
        <input className="h-11 border border-line px-2" name="startsAt" type="datetime-local" />
        <input className="h-11 border border-line px-2" name="endsAt" type="datetime-local" />
        <button type="submit">Save promotion</button>
      </form>
      {promotions.map((promo) => <p key={promo.id}>{promo.placement}: {promo.title}</p>)}
    </div>
  );
}
