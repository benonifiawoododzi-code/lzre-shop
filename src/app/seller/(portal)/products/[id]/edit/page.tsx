import { notFound } from "next/navigation";
import { uploadProductImageAction } from "@/actions/seller";
import { ProductForm } from "@/components/seller/product-form";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const product = await prisma.product.findFirst({
    where: { id, sellerId: user?.sellerProfile?.id },
    include: { variants: { include: { inventory: true } }, attributes: true, images: true, brand: true },
  });
  if (!product) notFound();
  const [categories, site] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.siteConfiguration.findUnique({ where: { id: "default" } }),
  ]);
  return (
    <div>
      <h1 className="font-display text-4xl text-navy">Edit {product.name}</h1>
      <p className="mt-2 text-sm text-muted">Saving an approved product returns it to review.</p>
      <div className="mt-6">
        <ProductForm
          categories={categories.map((category) => ({ id: category.id, name: category.name }))}
          currency={site?.currency ?? product.currency}
          productId={product.id}
          initial={{
            name: product.name,
            description: product.description,
            categoryId: product.categoryId,
            brandName: product.brand?.name ?? "",
            condition: product.condition,
            weightGrams: product.weightGrams,
            lowStockThreshold: product.lowStockThreshold,
            metaTitle: product.metaTitle ?? "",
            metaDescription: product.metaDescription ?? "",
            attributes: product.attributes.map((attribute) => ({ name: attribute.name, value: attribute.value })),
            variants: product.variants.map((variant) => ({ sku: variant.sku, name: variant.name, price: variant.price.toString(), compareAtPrice: variant.compareAtPrice?.toString() ?? "", stock: variant.inventory?.onHand ?? 0, options: (variant.options ?? {}) as Record<string, string> })),
          }}
        />
      </div>
      <form action={uploadProductImageAction} className="mt-8 grid max-w-md gap-2">
        <h2 className="font-display text-2xl">Images</h2>
        <input name="productId" type="hidden" value={product.id} />
        <input name="image" required type="file" />
        <input className="h-11 border border-line px-2" name="alt" placeholder="Alt text" />
        <button type="submit">Upload image</button>
        <div className="flex gap-2">{product.images.map((image) => <img alt={image.alt} className="size-16 object-cover" key={image.id} src={image.url} />)}</div>
      </form>
    </div>
  );
}
