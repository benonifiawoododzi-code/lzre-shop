import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

export const metadata = { robots: { index: false, follow: false } };

export default async function SellerPortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/seller/dashboard");
  if (!user.sellerProfile || user.sellerProfile.status !== "APPROVED") redirect("/seller/register");
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[200px_1fr]">
      <nav className="grid content-start gap-2 text-sm">
        <Link href="/seller/dashboard">Dashboard</Link>
        <Link href="/seller/products">Products</Link>
        <Link href="/seller/orders">Orders</Link>
        <Link href="/seller/inventory">Inventory</Link>
        <Link href="/seller/analytics">Analytics</Link>
        <Link href="/seller/store">Store</Link>
        <Link href="/seller/payouts">Payouts</Link>
        <Link href="/seller/settings">Settings</Link>
      </nav>
      <div>{children}</div>
    </div>
  );
}
