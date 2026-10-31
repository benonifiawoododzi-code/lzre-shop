import { saveBrandAction } from "@/actions/admin";
import { prisma } from "@/lib/db";

export const metadata = { title: "Brands" };

export default async function AdminBrandsPage() {
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Brands</h1>
      <form action={saveBrandAction} className="mt-4 flex gap-2">
        <input className="h-11 border border-line px-2" name="name" placeholder="Name" required />
        <label className="flex items-center gap-2"><input name="featured" type="checkbox" value="true" /> Featured</label>
        <button type="submit">Save</button>
      </form>
      {brands.map((brand) => <p className="mt-3" key={brand.id}>{brand.name}{brand.featured ? " · featured" : ""}</p>)}
    </div>
  );
}
