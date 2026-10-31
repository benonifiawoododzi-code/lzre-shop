import { updateStoreAction } from "@/actions/seller";
import { getCurrentUser } from "@/lib/current-user";

export const metadata = { title: "Store profile" };

export default async function StoreSettingsPage() {
  const user = await getCurrentUser();
  const store = user?.sellerProfile?.store;
  if (!store) return null;
  return (
    <form action={updateStoreAction} className="grid max-w-lg gap-3">
      <h1 className="font-display text-4xl text-navy">{store.name}</h1>
      <textarea className="border border-line p-3" defaultValue={store.description} name="description" rows={5} />
      <input className="h-11 border border-line px-3" defaultValue={store.city ?? ""} name="city" />
      <input className="h-11 border border-line px-3" defaultValue={store.region ?? ""} name="region" />
      <button className="h-11 bg-navy text-ivory" type="submit">Save store</button>
    </form>
  );
}
