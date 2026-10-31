import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { loadBrowser } from "@/lib/catalog/page-browser";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const brand = await prisma.brand.findUnique({ where: { slug } });
  return { title: brand?.name ?? "Brand", description: brand?.description ?? undefined };
}

export default async function BrandPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const brand = await prisma.brand.findFirst({ where: { slug, visible: true } });
  if (!brand) notFound();
  return loadBrowser({ title: brand.name, description: brand.description ?? undefined, basePath: `/brands/${slug}`, brandSlug: slug, searchParams: await searchParams });
}
