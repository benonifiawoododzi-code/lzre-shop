import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";

export const metadata = { robots: { index: false, follow: false } };

const links = ["", "/products", "/categories", "/brands", "/sellers", "/customers", "/orders", "/returns", "/reviews", "/promotions", "/shipping", "/settings"];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("ADMIN")) redirect("/");
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[180px_1fr]">
      <nav className="grid content-start gap-2 text-sm">
        {links.map((link) => <Link href={`/admin${link}`} key={link}>{link ? link.slice(1) : "Overview"}</Link>)}
      </nav>
      <div>{children}</div>
    </div>
  );
}
