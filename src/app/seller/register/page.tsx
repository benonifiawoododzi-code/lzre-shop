import Link from "next/link";
import { SellerApplicationForm } from "@/components/seller/application-form";
import { getCurrentUser } from "@/lib/current-user";

export const metadata = { title: "Sell on LZRE", robots: { index: false } };

export default async function SellerRegisterPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const user = await getCurrentUser();
  const { submitted } = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-display text-4xl text-navy">Sell on LZRE</h1>
      {!user ? <p className="mt-4">Create a customer account first. <Link className="underline" href="/register">Register</Link> or <Link className="underline" href="/login?callbackUrl=/seller/register">sign in</Link>.</p> : null}
      {submitted ? <p className="mt-4">Application received. An administrator must approve it before products can be published.</p> : null}
      {user?.sellerProfile ? <p className="mt-4">Application status: {user.sellerProfile.status}. {user.sellerProfile.rejectionReason ?? ""}</p> : null}
      {user && (!user.sellerProfile || user.sellerProfile.status === "REJECTED") ? <div className="mt-6"><SellerApplicationForm /></div> : null}
      {user?.sellerProfile?.status === "APPROVED" ? <p className="mt-4"><Link href="/seller/dashboard">Open the seller dashboard</Link></p> : null}
    </div>
  );
}
