import Link from "next/link";
import { RegisterForm } from "@/components/auth/forms";

export const metadata = { title: "Create account", robots: { index: false } };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-4xl text-navy">Create an account</h1>
      <div className="mt-6"><RegisterForm /></div>
      <p className="mt-4 text-sm"><Link href="/login">Already have an account</Link></p>
    </div>
  );
}
