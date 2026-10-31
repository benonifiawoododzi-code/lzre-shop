import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const staticRoutes = ["", "/products", "/categories", "/brands", "/contact", "/legal/about", "/legal/shipping", "/legal/returns", "/legal/privacy", "/legal/terms", "/legal/selling"].map((path) => ({
    url: `${base}${path || "/"}`,
  }));
  try {
    const [products, categories, brands, stores] = await Promise.all([
      prisma.product.findMany({ where: { status: "APPROVED", deletedAt: null }, select: { slug: true, updatedAt: true } }),
      prisma.category.findMany({ where: { visible: true }, select: { slug: true } }),
      prisma.brand.findMany({ where: { visible: true }, select: { slug: true } }),
      prisma.sellerStore.findMany({ where: { active: true }, select: { slug: true } }),
    ]);
    return [
      ...staticRoutes,
      ...products.map((product) => ({ url: `${base}/products/${product.slug}`, lastModified: product.updatedAt })),
      ...categories.map((category) => ({ url: `${base}/categories/${category.slug}` })),
      ...brands.map((brand) => ({ url: `${base}/brands/${brand.slug}` })),
      ...stores.map((store) => ({ url: `${base}/stores/${store.slug}` })),
    ];
  } catch {
    return staticRoutes;
  }
}
