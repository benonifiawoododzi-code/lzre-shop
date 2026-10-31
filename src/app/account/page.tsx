import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [orders, notifications] = await Promise.all([
    prisma.order.count({ where: { userId: user.id } }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Hello, {user.name}</h1>
      <p className="mt-3 text-muted">{orders} orders · {notifications} unread notifications</p>
      {!user.emailVerified ? <p className="mt-4 text-sm">Email is not verified. A verification message is delivered only when email is configured.</p> : null}
      <div className="mt-6 flex gap-4 text-sm">
        <Link href="/account/orders">View orders</Link>
        {user.roles.includes("SELLER") ? <Link href="/seller/dashboard">Seller dashboard</Link> : <Link href="/seller/register">Become a seller</Link>}
      </div>
    </div>
  );
}
