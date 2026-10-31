import { deleteAddressAction, saveAddressAction } from "@/actions/account";
import { ghanaRegions } from "@/config/ghana";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const addresses = await prisma.address.findMany({ where: { userId: user.id }, orderBy: { isDefault: "desc" } });
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Addresses</h1>
      {addresses.map((address) => (
        <div className="mt-4 border-b border-line py-3" key={address.id}>
          <p>{address.fullName}, {address.line1}, {address.city}, {address.region}</p>
          <form action={deleteAddressAction}><input name="id" type="hidden" value={address.id} /><button type="submit">Delete</button></form>
        </div>
      ))}
      <form action={saveAddressAction} className="mt-6 grid max-w-lg gap-3">
        <h2 className="font-display text-2xl">Add address</h2>
        <input className="h-11 border border-line px-3" name="fullName" placeholder="Full name" required />
        <input className="h-11 border border-line px-3" name="phone" placeholder="Phone" required />
        <input className="h-11 border border-line px-3" name="line1" placeholder="Address" required />
        <input className="h-11 border border-line px-3" name="city" placeholder="City" required />
        <select className="h-11 border border-line px-2" name="region">{ghanaRegions.map((region) => <option key={region}>{region}</option>)}</select>
        <input className="h-11 border border-line px-3" name="ghanaPostGps" placeholder="GhanaPost GPS (optional)" />
        <label className="flex gap-2"><input name="isDefault" type="checkbox" value="true" /> Default</label>
        <button className="h-11 bg-navy text-ivory" type="submit">Save address</button>
      </form>
    </div>
  );
}
