import { brandDefaults } from "@/config/site";
import { ProductForm } from "@/components/seller/product-form";
import { prisma } from "@/lib/db";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const [categories, site] = await Promise.all([
    prisma.category.findMany({ where: { visible: true }, orderBy: { name: "asc" } }),
    prisma.siteConfiguration.findUnique({ where: { id: "default" } }),
  ]);
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">New product</h1>
      <p className="mt-2 text-sm text-muted">Submitting sends the product for administrator review. It is not public until approved.</p>
      <div className="mt-6"><ProductForm categories={categories.map((category) => ({ id: category.id, name: category.name }))} currency={site?.currency ?? brandDefaults.currency} /></div>
    </div>
  );
}
