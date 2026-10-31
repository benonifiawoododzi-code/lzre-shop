import { NextResponse } from "next/server";
import { cardInclude, toCard } from "@/lib/catalog/browse";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const ids = new URL(request.url).searchParams.get("ids")?.split(",").filter((id) => /^[a-z0-9]{10,40}$/i.test(id)).slice(0, 8) ?? [];
  if (ids.length === 0) return NextResponse.json([]);
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, status: "APPROVED", deletedAt: null },
    include: cardInclude,
  });
  const rank = new Map(ids.map((id, index) => [id, index]));
  return NextResponse.json(products.map(toCard).sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0)));
}
