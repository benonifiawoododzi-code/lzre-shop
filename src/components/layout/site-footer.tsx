import Link from "next/link";
import { subscribeNewsletterAction } from "@/actions/content";

export function SiteFooter({
  name,
  supportEmail,
  phone,
  address,
  paystack,
}: {
  name: string;
  supportEmail: string;
  phone: string;
  address: string;
  paystack: boolean;
}) {
  return (
    <footer className="mt-16 bg-navy text-ivory">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-4">
        <div>
          <p className="font-display text-2xl">{name}</p>
          <p className="mt-3 text-sm text-ivory/80">One catalog. Sellers fulfill their own orders. Prices are confirmed on the server at checkout.</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Shop</p>
          <div className="mt-3 grid gap-2">
            <Link href="/categories">Categories</Link>
            <Link href="/products">All products</Link>
            <Link href="/brands">Brands</Link>
            <Link href="/wishlist">Wishlist</Link>
          </div>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Help</p>
          <div className="mt-3 grid gap-2">
            <Link href="/legal/about">About</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/legal/shipping">Shipping</Link>
            <Link href="/legal/returns">Returns</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/selling">Selling on {name}</Link>
          </div>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Newsletter</p>
          <p className="mt-3 text-ivory/80">We save your address here. An external newsletter provider is used only when email delivery is configured.</p>
          <form action={subscribeNewsletterAction} className="mt-3 grid gap-2">
            <label className="sr-only" htmlFor="newsletter-email">Email</label>
            <input className="h-11 border border-white/20 bg-transparent px-3" id="newsletter-email" name="email" placeholder="Email address" type="email" required />
            <label className="flex gap-2 text-xs"><input name="consent" required type="checkbox" value="true" /> I agree to store this email for marketplace news.</label>
            <button className="h-11 bg-ivory text-navy" type="submit">Save email</button>
          </form>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-4 px-4 py-4 text-xs text-ivory/70">
          <span>{address}</span>
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          <a href={`tel:${phone}`}>{phone}</a>
          <span>{paystack ? "Online payments: Paystack cards and mobile money." : "Online payments are not configured."}</span>
          <span>Cash on delivery where the delivery zone allows it.</span>
        </div>
      </div>
    </footer>
  );
}
