"use client";

import { useEffect, useState } from "react";
import { ProductCardView } from "@/components/catalog/product-card";
import type { ProductCard } from "@/types/catalog";

export function RecentlyViewed() {
  const [products, setProducts] = useState<ProductCard[]>([]);
  useEffect(() => {
    const raw = window.localStorage.getItem("lzre.viewed");
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    if (ids.length === 0) return;
    void fetch(`/api/catalog/cards?ids=${ids.slice(0, 8).join(",")}`).then(async (response) => {
      if (response.ok) setProducts(await response.json());
    });
  }, []);
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="font-display text-3xl text-navy">Recently viewed</h2>
      <p className="mt-2 text-sm text-muted">Stored in this browser only.</p>
      <div className="mt-4 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => <ProductCardView key={product.id} product={product} />)}
      </div>
    </section>
  );
}

export function RememberProduct({ id }: { id: string }) {
  useEffect(() => {
    const raw = window.localStorage.getItem("lzre.viewed");
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    window.localStorage.setItem("lzre.viewed", JSON.stringify([id, ...ids.filter((item) => item !== id)].slice(0, 8)));
  }, [id]);
  return null;
}
