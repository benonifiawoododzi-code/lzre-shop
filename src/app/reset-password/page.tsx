import { ResetForm } from "@/components/auth/forms";

export const metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) return <p className="px-4 py-12">This reset link is missing a token.</p>;
  return <div className="mx-auto max-w-md px-4 py-12"><h1 className="font-display text-4xl text-navy">Choose a new password</h1><div className="mt-6"><ResetForm token={token} /></div></div>;
}
