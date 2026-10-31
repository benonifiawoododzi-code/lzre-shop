import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeSearchTerm } from "@/lib/catalog/csv";
import { rateLimit } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const term = normalizeSearchTerm(url.searchParams.get("q") ?? "");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`suggest:${ip}`, 30, 60_000).allowed) return NextResponse.json({ products: [], categories: [], brands: [], sellers: [] }, { status: 429 });
  if (!term) return NextResponse.json({ products: [], categories: [], brands: [], sellers: [] });
  const [products, categories, brands, sellers, popular] = await Promise.all([
    prisma.product.findMany({ where: { status: "APPROVED", deletedAt: null, name: { contains: term, mode: "insensitive" } }, select: { name: true, slug: true }, take: 5 }),
    prisma.category.findMany({ where: { visible: true, name: { contains: term, mode: "insensitive" } }, select: { name: true, slug: true }, take: 4 }),
    prisma.brand.findMany({ where: { visible: true, name: { contains: term, mode: "insensitive" } }, select: { name: true, slug: true }, take: 4 }),
    prisma.sellerStore.findMany({ where: { active: true, name: { contains: term, mode: "insensitive" } }, select: { name: true, slug: true }, take: 4 }),
    prisma.searchQuery.findMany({ orderBy: { count: "desc" }, take: 5 }),
  ]);
  return NextResponse.json({ products, categories, brands, sellers, popular: popular.map((row) => row.term) });
}
