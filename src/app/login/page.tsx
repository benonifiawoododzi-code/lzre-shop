import Link from "next/link";
import { LoginForm } from "@/components/auth/forms";

export const metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-4xl text-navy">Sign in</h1>
      <div className="mt-6"><LoginForm callbackUrl={callbackUrl} /></div>
      <p className="mt-4 text-sm"><Link href="/register">Create an account</Link> · <Link href="/forgot-password">Forgot password</Link></p>
    </div>
  );
}
