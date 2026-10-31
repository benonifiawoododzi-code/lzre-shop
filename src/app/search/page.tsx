import type { Metadata } from "next";
import { loadBrowser } from "@/lib/catalog/page-browser";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  return loadBrowser({ title: q ? `Results for “${q}”` : "Search", basePath: "/search", searchParams: sp, recordSearch: true });
}
