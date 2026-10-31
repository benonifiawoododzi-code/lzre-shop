import { CheckoutForm } from "@/components/checkout/checkout-form";
import { paystackConfigured, sandboxAllowed } from "@/lib/commerce/checkout";
import { quoteCart } from "@/lib/commerce/quote-cart";
import { getCurrentUser, readGuestKey } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const guestKey = await readGuestKey();
  const addresses = user ? await prisma.address.findMany({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }) : [];
  const region = addresses[0]?.region ?? "Greater Accra";
  const quoted = await quoteCart({ userId: user?.id ?? null, guestKey, region });
  if ("error" in quoted) return <p className="px-4 py-10">{quoted.error}</p>;
  if (quoted.lines.length === 0) return <p className="px-4 py-10">Your cart is empty.</p>;
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[1fr_280px]">
      <div>
        <h1 className="font-display text-4xl text-navy">Checkout</h1>
        <div className="mt-6">
          <CheckoutForm
            addresses={addresses.map((address) => ({ id: address.id, fullName: address.fullName, phone: address.phone, line1: address.line1, city: address.city, region: address.region, ghanaPostGps: address.ghanaPostGps }))}
            codAllowed={quoted.codAllowed}
            currency={quoted.currency}
            defaults={{ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" }}
            methods={quoted.methods}
            paystack={paystackConfigured()}
            sandbox={sandboxAllowed()}
            summary={{ merchandise: quoted.quote.merchandise, discount: quoted.quote.discount, shipping: quoted.quote.shipping, tax: quoted.quote.tax, grand: quoted.quote.grand, errors: quoted.quote.errors }}
          />
        </div>
      </div>
      <aside>
        <h2 className="font-display text-2xl">Your items</h2>
        {quoted.lines.map((line) => <p className="mt-3 text-sm" key={line.key}>{line.quantity} × {line.name}<span className="block text-muted">{line.sellerName}</span></p>)}
      </aside>
    </div>
  );
}
