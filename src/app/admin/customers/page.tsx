import { setCustomerStatusAction } from "@/actions/admin";
import { prisma } from "@/lib/db";

export const metadata = { title: "Customers" };

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q ?? "";
  const customers = await prisma.user.findMany({
    where: { roles: { has: "CUSTOMER" }, OR: q ? [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] : undefined },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { _count: { select: { orders: true } } },
  });
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Customers</h1>
      <form className="mt-4"><input className="h-11 border border-line px-2" name="q" placeholder="Search" defaultValue={q} /></form>
      {customers.map((customer) => (
        <div className="mt-3 flex items-center justify-between border-b border-line py-2" key={customer.id}>
          <span>{customer.name} · {customer.email} · {customer._count.orders} orders · {customer.status}</span>
          <form action={setCustomerStatusAction}>
            <input name="id" type="hidden" value={customer.id} />
            <input name="status" type="hidden" value={customer.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"} />
            <button type="submit">{customer.status === "ACTIVE" ? "Suspend" : "Reinstate"}</button>
          </form>
        </div>
      ))}
    </div>
  );
}
