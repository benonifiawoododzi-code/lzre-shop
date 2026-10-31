import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Brands" };

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({ where: { visible: true }, orderBy: { name: "asc" } });
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl text-navy">Brands</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand) => (
          <Link className="border-t border-navy pt-3" href={`/brands/${brand.slug}`} key={brand.id}>
            <p className="font-display text-2xl">{brand.name}</p>
            {brand.description ? <p className="mt-2 text-sm text-muted">{brand.description}</p> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
