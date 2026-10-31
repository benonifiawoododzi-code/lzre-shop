import type { Metadata } from "next";
import { Outfit, Source_Sans_3 } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { brandDefaults } from "@/config/site";
import { getVisibleCategories } from "@/lib/catalog/browse";
import { findCart } from "@/lib/commerce/quote-cart";
import { getCurrentUser, readGuestKey } from "@/lib/current-user";
import { paystackConfigured } from "@/lib/commerce/checkout";
import { prisma } from "@/lib/db";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-source" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: { default: brandDefaults.name, template: `%s · ${brandDefaults.name}` },
  description: brandDefaults.description,
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let name: string = brandDefaults.name;
  let categories: { name: string; slug: string; icon: string | null; children: { name: string; slug: string }[] }[] = [];
  let cartCount = 0;
  let userName: string | null = null;
  let supportEmail: string = brandDefaults.supportEmail;
  let phone: string = brandDefaults.phone;
  let address: string = brandDefaults.address;
  try {
    const [site, all, user, guestKey] = await Promise.all([
      prisma.siteConfiguration.findUnique({ where: { id: "default" } }),
      getVisibleCategories(),
      getCurrentUser(),
      readGuestKey(),
    ]);
    if (site) {
      name = site.marketplaceName;
      supportEmail = site.supportEmail;
      phone = site.phone;
      address = site.address;
    }
    const parents = all.filter((category) => !category.parentId);
    categories = parents.map((category) => ({
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      children: all.filter((child) => child.parentId === category.id).map((child) => ({ name: child.name, slug: child.slug })),
    }));
    userName = user?.name ?? null;
    const cart = await findCart(user?.id ?? null, guestKey);
    cartCount = cart?.items.filter((item) => !item.savedForLater).reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  } catch {
    categories = [];
  }

  return (
    <html lang="en" className={`${outfit.variable} ${sourceSans.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <SiteHeader cartCount={cartCount} categories={categories} name={name} phone={phone} userName={userName} />
        <main id="main">{children}</main>
        <SiteFooter address={address} name={name} paystack={paystackConfigured()} phone={phone} supportEmail={supportEmail} />
      </body>
    </html>
  );
}
