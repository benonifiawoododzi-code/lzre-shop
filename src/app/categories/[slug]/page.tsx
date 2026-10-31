import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVisibleCategories } from "@/lib/catalog/browse";
import { loadBrowser } from "@/lib/catalog/page-browser";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getVisibleCategories();
  const category = categories.find((item) => item.slug === slug);
  if (!category) return { title: "Category" };
  return { title: category.metaTitle || category.name, description: category.metaDescription || category.description };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const categories = await getVisibleCategories();
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  return loadBrowser({
    title: category.name,
    description: category.description,
    basePath: `/categories/${slug}`,
    categorySlug: slug,
    searchParams: await searchParams,
  });
}
