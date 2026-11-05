import type { Metadata } from "next";
import Link from "next/link";
import { CategoryIcon } from "@/components/catalog/category-icon";
import { getVisibleCategories } from "@/lib/catalog/browse";

export const metadata: Metadata = { title: "Categories", description: "Browse LZRE Books categories." };

export default async function CategoriesPage() {
  const categories = await getVisibleCategories();
  const parents = categories.filter((category) => !category.parentId);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl text-navy">Categories</h1>
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {parents.map((category) => (
          <section key={category.id}>
            <Link className="flex items-center gap-3 font-display text-2xl" href={`/categories/${category.slug}`}>
              <CategoryIcon name={category.icon} />
              {category.name}
            </Link>
            <p className="mt-2 text-sm text-muted">{category.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.filter((child) => child.parentId === category.id).map((child) => (
                <Link className="border border-line px-3 py-1 text-sm" href={`/categories/${child.slug}`} key={child.id}>{child.name}</Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
