import { markNotificationsReadAction } from "@/actions/account";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const notifications = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl text-navy">Notifications</h1>
        <form action={markNotificationsReadAction}><button type="submit">Mark read</button></form>
      </div>
      {notifications.length === 0 ? <p className="mt-4 text-muted">No notifications.</p> : null}
      <div className="mt-4 grid gap-3">
        {notifications.map((notification) => (
          <article className="border-b border-line py-3" key={notification.id}>
            <p className="font-medium">{notification.title}</p>
            <p className="text-sm text-muted">{notification.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
