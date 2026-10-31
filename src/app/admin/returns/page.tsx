import { decideReturnAction } from "@/actions/admin";
import { prisma } from "@/lib/db";

export const metadata = { title: "Returns" };

export default async function AdminReturnsPage() {
  const returns = await prisma.returnRequest.findMany({ orderBy: { createdAt: "desc" }, include: { order: true } });
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Returns</h1>
      {returns.map((item) => (
        <form action={decideReturnAction} className="mt-4 grid gap-2 border-b border-line pb-4" key={item.id}>
          <p>{item.order.number} · {item.reason} · {item.status}</p>
          <p className="text-sm">{item.description}</p>
          <input name="id" type="hidden" value={item.id} />
          <select className="h-11 border border-line" name="status"><option>APPROVED</option><option>REJECTED</option><option>RECEIVED</option><option>CLOSED</option></select>
          <input className="h-11 border border-line px-2" name="response" placeholder="Response" />
          <button type="submit">Update return</button>
        </form>
      ))}
    </div>
  );
}
