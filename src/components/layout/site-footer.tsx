import Link from "next/link";
import { Leaf } from "lucide-react";
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
    <footer className="mt-16">
      <section className="bg-sand">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-12 md:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="font-display text-3xl text-navy">Join our community</h2>
            <p className="mt-2 max-w-md text-sm text-muted">Be the first to hear about new books. We store this email only after you agree.</p>
          </div>
          <form action={subscribeNewsletterAction} className="grid gap-3">
            <label className="sr-only" htmlFor="newsletter-email">Email</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className="h-12 flex-1 border border-line bg-paper px-4" id="newsletter-email" name="email" placeholder="Enter your email address" type="email" required />
              <button className="h-12 bg-navy px-6 font-semibold text-ivory" type="submit">Subscribe</button>
            </div>
            <label className="flex gap-2 text-xs text-muted"><input name="consent" required type="checkbox" value="true" /> I agree to store this email for bookshop news.</label>
          </form>
        </div>
      </section>
      <div className="bg-navy text-ivory">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="flex items-center gap-2 font-display text-2xl"><Leaf className="size-5" /> {name}</p>
            <p className="mt-3 text-sm text-ivory/75">One catalog of books. Sellers fulfill their own orders. Prices are confirmed on the server at checkout.</p>
          </div>
          <div className="text-sm">
            <p className="font-semibold">Shop</p>
            <div className="mt-3 grid gap-2 text-ivory/80">
              <Link href="/products">All books</Link>
              <Link href="/products?sort=newest">New arrivals</Link>
              <Link href="/products?discount=1">Deals</Link>
              <Link href="/categories">Categories</Link>
              <Link href="/brands">Brands</Link>
            </div>
          </div>
          <div className="text-sm">
            <p className="font-semibold">Help</p>
            <div className="mt-3 grid gap-2 text-ivory/80">
              <Link href="/contact">Contact</Link>
              <Link href="/legal/shipping">Shipping</Link>
              <Link href="/legal/returns">Returns</Link>
              <Link href="/legal/selling">Selling on {name}</Link>
            </div>
          </div>
          <div className="text-sm">
            <p className="font-semibold">Company</p>
            <div className="mt-3 grid gap-2 text-ivory/80">
              <Link href="/legal/about">About</Link>
              <Link href="/legal/privacy">Privacy</Link>
              <Link href="/legal/terms">Terms</Link>
              <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
              <a href={`tel:${phone}`}>{phone}</a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-4 px-4 py-4 text-xs text-ivory/70">
            <span>{address}</span>
            <span>{paystack ? "Online payments: Paystack cards and mobile money." : "Online payments are not configured."}</span>
            <span>Cash on delivery where the delivery zone allows it.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
