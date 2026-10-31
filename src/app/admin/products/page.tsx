import { approveProductAction, featureProductAction, rejectProductAction } from "@/actions/admin";
import { prisma } from "@/lib/db";

export const metadata = { title: "Admin products" };

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({ where: { deletedAt: null }, include: { seller: { include: { store: true } } }, orderBy: { updatedAt: "desc" }, take: 100 });
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Products</h1>
      {products.map((product) => (
        <div className="mt-4 border-b border-line py-3" key={product.id}>
          <p>{product.name} · {product.status} · {product.seller.store?.name}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <form action={approveProductAction}><input name="id" type="hidden" value={product.id} /><button type="submit">Approve</button></form>
            <form action={featureProductAction}><input name="id" type="hidden" value={product.id} /><button type="submit">{product.isFeatured ? "Unfeature" : "Feature"}</button></form>
            <form action={rejectProductAction} className="flex gap-2"><input name="id" type="hidden" value={product.id} /><input className="border border-line px-2" name="reason" placeholder="Reason" /><button type="submit">Reject</button></form>
          </div>
        </div>
      ))}
    </div>
  );
}
