import type { Metadata } from "next";
import { loadBrowser } from "@/lib/catalog/page-browser";

export const metadata: Metadata = { title: "Books", description: "Browse the LZRE Books catalog." };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return loadBrowser({ title: "All books", basePath: "/products", searchParams: await searchParams });
}
