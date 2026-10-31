import { deleteCategoryAction, saveCategoryAction } from "@/actions/admin";
import { prisma } from "@/lib/db";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } });
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Categories</h1>
      <form action={saveCategoryAction} className="mt-4 grid max-w-lg gap-2">
        <input className="h-11 border border-line px-2" name="name" placeholder="Name" required />
        <input className="h-11 border border-line px-2" name="slug" placeholder="Slug" />
        <textarea className="border border-line p-2" name="description" placeholder="Description" required />
        <select className="h-11 border border-line" name="parentId"><option value="">No parent</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        <button type="submit">Save category</button>
      </form>
      {categories.map((category) => (
        <div className="mt-3 flex items-center justify-between border-b border-line py-2" key={category.id}>
          <span>{category.name} · {category._count.products} products</span>
          <form action={deleteCategoryAction}><input name="id" type="hidden" value={category.id} /><button type="submit">Delete if empty</button></form>
        </div>
      ))}
    </div>
  );
}
