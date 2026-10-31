import type { Metadata } from "next";
import { loadBrowser } from "@/lib/catalog/page-browser";

export const metadata: Metadata = { title: "Products", description: "Browse the LZRE catalog." };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return loadBrowser({ title: "All products", basePath: "/products", searchParams: await searchParams });
}
