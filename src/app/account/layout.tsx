import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { getCurrentUser } from "@/lib/current-user";

export const metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[200px_1fr]">
      <aside className="grid content-start gap-2 text-sm">
        <p className="font-medium">{user.name}</p>
        <Link href="/account">Overview</Link>
        <Link href="/account/profile">Profile</Link>
        <Link href="/account/addresses">Addresses</Link>
        <Link href="/account/orders">Orders</Link>
        <Link href="/account/wishlist">Wishlist</Link>
        <Link href="/account/notifications">Notifications</Link>
        <form action={logoutAction}><button type="submit">Sign out</button></form>
      </aside>
      <div>{children}</div>
    </div>
  );
}
