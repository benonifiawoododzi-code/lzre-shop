import { updateProfileAction } from "@/actions/account";
import { getCurrentUser } from "@/lib/current-user";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <form action={updateProfileAction} className="grid max-w-lg gap-3">
      <h1 className="font-display text-4xl text-navy">Profile</h1>
      <label>Name<input className="mt-1 h-11 w-full border border-line px-3" defaultValue={user.name} name="name" required /></label>
      <label>Phone<input className="mt-1 h-11 w-full border border-line px-3" defaultValue={user.phone ?? ""} name="phone" required /></label>
      <label className="flex gap-2"><input defaultChecked={user.marketingConsent} name="marketingConsent" type="checkbox" value="true" /> Marketing email</label>
      <label className="flex gap-2"><input defaultChecked={user.notificationPreference?.orderEmail ?? true} name="orderEmail" type="checkbox" value="true" /> Order email when delivery is configured</label>
      <button className="h-11 bg-navy text-ivory" type="submit">Save profile</button>
    </form>
  );
}
