import Link from "next/link";
import { applyCouponAction, moveSavedToCartAction, removeCartItemAction, removeCouponAction, saveForLaterAction, updateCartItemAction } from "@/actions/cart";
import { Price } from "@/components/ui/price";
import { EmptyState } from "@/components/ui/empty-state";
import { quoteCart } from "@/lib/commerce/quote-cart";
import { getCurrentUser, readGuestKey } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/pricing/money";

export const metadata = { title: "Cart", robots: { index: false } };

export default async function CartPage() {
  const user = await getCurrentUser();
  const guestKey = await readGuestKey();
  const address = user ? await prisma.address.findFirst({ where: { userId: user.id, isDefault: true } }) : null;
  const quoted = await quoteCart({ userId: user?.id ?? null, guestKey, region: address?.region });
  if ("error" in quoted) return <p className="px-4 py-10">{quoted.error}</p>;
  if (quoted.lines.length === 0 && quoted.saved.length === 0) {
    return <div className="mx-auto max-w-3xl px-4 py-10"><EmptyState action="Browse products" body="Your cart is empty. Approved products from the catalog can be added here." href="/products" title="Nothing in the cart" /></div>;
  }
  const groups = new Map<string, typeof quoted.lines>();
  for (const line of quoted.lines) {
    groups.set(line.sellerName, [...(groups.get(line.sellerName) ?? []), line]);
  }
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="font-display text-4xl text-navy">Cart</h1>
        {[...groups.entries()].map(([seller, lines]) => (
          <section className="mt-8" key={seller}>
            <h2 className="text-sm uppercase tracking-[0.14em] text-muted">{seller}</h2>
            {lines.map((line) => (
              <div className="grid grid-cols-[88px_1fr] gap-4 border-b border-line py-4" key={line.key}>
                <img alt="" className="size-20 bg-sand object-cover" src={line.image} />
                <div>
                  <p className="font-medium">{line.name}</p>
                  <p className="text-sm text-muted">{line.variantName}</p>
                  <Price amount={line.unitPrice} currency={quoted.currency} />
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    <form action={updateCartItemAction} className="flex gap-2">
                      <input name="id" type="hidden" value={line.key} />
                      <input className="h-10 w-16 border border-line px-2" defaultValue={line.quantity} max={Math.min(20, line.available)} min={1} name="quantity" type="number" />
                      <button type="submit">Update</button>
                    </form>
                    <form action={saveForLaterAction}><input name="id" type="hidden" value={line.key} /><button type="submit">Save for later</button></form>
                    <form action={removeCartItemAction}><input name="id" type="hidden" value={line.key} /><button type="submit">Remove</button></form>
                  </div>
                </div>
              </div>
            ))}
          </section>
        ))}
        {quoted.saved.length > 0 ? (
          <section className="mt-8">
            <h2 className="font-display text-2xl">Saved for later</h2>
            {quoted.saved.map((item) => (
              <form action={moveSavedToCartAction} className="mt-3 flex items-center justify-between gap-3" key={item.id}>
                <span>{item.name}</span>
                <input name="id" type="hidden" value={item.id} />
                <button type="submit">Move to cart</button>
              </form>
            ))}
          </section>
        ) : null}
      </div>
      <aside className="h-fit border border-line bg-paper p-4">
        <h2 className="font-display text-2xl">Summary</h2>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between"><dt>Merchandise</dt><dd>{formatMoney(quoted.quote.merchandise, quoted.currency)}</dd></div>
          <div className="flex justify-between"><dt>Discounts</dt><dd>{formatMoney(quoted.quote.discount, quoted.currency)}</dd></div>
          <div className="flex justify-between"><dt>Shipping {address ? `estimate, ${address.region}` : "at checkout"}</dt><dd>{address ? formatMoney(quoted.quote.shipping, quoted.currency) : "—"}</dd></div>
          <div className="flex justify-between"><dt>Tax included</dt><dd>{formatMoney(quoted.quote.tax, quoted.currency)}</dd></div>
          <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatMoney(address ? quoted.quote.grand : quoted.quote.merchandise - quoted.quote.discount, quoted.currency)}</dd></div>
        </dl>
        {quoted.taxDemonstration ? <p className="mt-3 text-xs text-warning">Tax settings are still marked as demonstration.</p> : null}
        {quoted.quote.errors.map((error) => <p className="mt-2 text-sm text-danger" key={error} role="alert">{error}</p>)}
        <form action={applyCouponAction} className="mt-4 flex gap-2">
          <input className="h-11 flex-1 border border-line px-2" name="code" placeholder="Coupon" defaultValue={quoted.couponCode ?? ""} />
          <button type="submit">Apply</button>
        </form>
        {quoted.couponCode ? <form action={removeCouponAction} className="mt-2"><button type="submit">Remove coupon</button></form> : null}
        <Link className="mt-4 flex h-11 items-center justify-center bg-signal font-semibold text-white" href="/checkout">Checkout</Link>
      </aside>
    </div>
  );
}
