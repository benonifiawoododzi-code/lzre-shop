import { ForgotForm } from "@/components/auth/forms";

export const metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPage() {
  return <div className="mx-auto max-w-md px-4 py-12"><h1 className="font-display text-4xl text-navy">Reset password</h1><div className="mt-6"><ForgotForm /></div></div>;
}
