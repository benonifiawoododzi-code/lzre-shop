import Link from "next/link";
import { archiveProductAction, importProductsAction } from "@/actions/seller";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const metadata = { title: "Seller products" };

export default async function SellerProductsPage() {
  const user = await getCurrentUser();
  const products = await prisma.product.findMany({ where: { sellerId: user?.sellerProfile?.id, deletedAt: null }, orderBy: { updatedAt: "desc" } });
  return (
    <div>
      <div className="flex items-center justify-between"><h1 className="font-display text-4xl text-navy">Products</h1><Link href="/seller/products/new">New product</Link></div>
      <form action={importProductsAction} className="mt-4 flex gap-2">
        <input accept=".csv,text/csv" name="file" required type="file" />
        <button type="submit">Import CSV drafts</button>
      </form>
      <p className="mt-2 text-xs text-muted">Header: name,description,category,price,stock,sku,brand. Category is the category slug. Imports stay as drafts.</p>
      <div className="mt-6 grid gap-3">
        {products.map((product) => (
          <div className="flex items-center justify-between border-b border-line py-3" key={product.id}>
            <Link href={`/seller/products/${product.id}/edit`}>{product.name}<span className="block text-sm text-muted">{product.status}</span></Link>
            <form action={archiveProductAction}><input name="id" type="hidden" value={product.id} /><button type="submit">Archive</button></form>
          </div>
        ))}
      </div>
    </div>
  );
}
