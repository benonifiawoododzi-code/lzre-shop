import { redirect } from "next/navigation";

export default async function SellerLoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl || "/seller/dashboard")}`);
}
