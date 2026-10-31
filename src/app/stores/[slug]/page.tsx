import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { loadBrowser } from "@/lib/catalog/page-browser";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await prisma.sellerStore.findUnique({ where: { slug } });
  return { title: store?.name ?? "Store", description: store?.description };
}

export default async function StorePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const store = await prisma.sellerStore.findFirst({ where: { slug, active: true, seller: { status: "APPROVED" } } });
  if (!store) notFound();
  return (
    <div>
      <div className="bg-navy text-ivory">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="font-display text-4xl">{store.name}</h1>
          <p className="mt-3 max-w-2xl text-ivory/80">{store.description}</p>
          <p className="mt-3 text-sm">{store.ratingCount > 0 ? `${Number(store.ratingAverage).toFixed(1)} from ${store.ratingCount} reviews` : "No ratings yet"}</p>
        </div>
      </div>
      {await loadBrowser({ title: "Products", basePath: `/stores/${slug}`, storeSlug: slug, searchParams: await searchParams })}
    </div>
  );
}
