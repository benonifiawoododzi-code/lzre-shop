import { getCurrentUser } from "@/lib/current-user";

export const metadata = { title: "Seller settings" };

export default async function SellerSettingsPage() {
  const user = await getCurrentUser();
  const seller = user?.sellerProfile;
  if (!seller) return null;
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Settings</h1>
      <p className="mt-4">Payout destination: {seller.payoutType ?? "Not set"}</p>
      <p className="mt-2">Commission is set by an administrator and cannot be changed here. {seller.commissionRate ? `${seller.commissionRate}%` : "Marketplace default"}.</p>
      <p className="mt-2 text-sm text-muted">Bank and mobile money details are visible only to you and administrators.</p>
    </div>
  );
}
