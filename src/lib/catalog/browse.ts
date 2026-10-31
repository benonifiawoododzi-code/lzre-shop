import { Prisma } from "@prisma/client";
import { cache } from "react";
import { pageSize } from "@/config/site";
import { prisma } from "@/lib/db";
import { discountPercent, cedisToPesewas } from "@/lib/pricing/money";
import { isPromotionLive } from "@/lib/security/tokens";
import type { ProductCard } from "@/types/catalog";

export const cardInclude = {
  brand: { select: { name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
  seller: { include: { store: { select: { name: true, slug: true, active: true } } } },
  variants: {
    where: { active: true },
    include: { inventory: true },
    orderBy: { price: "asc" as const },
  },
} satisfies Prisma.ProductInclude;

type CardProduct = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export function toCard(product: CardProduct): ProductCard {
  const variant = product.variants.find((item) => item.isDefault) ?? product.variants[0];
  const price = variant ? cedisToPesewas(variant.price.toString()) : cedisToPesewas(product.fromPrice.toString());
  const compare = variant?.compareAtPrice ? cedisToPesewas(variant.compareAtPrice.toString()) : product.compareFromPrice ? cedisToPesewas(product.compareFromPrice.toString()) : null;
  const available = product.variants.reduce((sum, item) => sum + (item.inventory?.available ?? 0), 0);
  const image = product.images[0];
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand?.name ?? null,
    pricePesewas: price,
    comparePesewas: compare,
    discountPercent: discountPercent(price, compare),
    currency: product.currency,
    image: image?.url ?? `/demo-image/${product.slug}`,
    imageAlt: image?.alt ?? product.name,
    rating: Number(product.ratingAverage),
    ratingCount: product.ratingCount,
    sellerName: product.seller.store?.name ?? product.seller.legalName,
    sellerSlug: product.seller.store?.slug ?? "",
    available,
    canQuickAdd: product.variants.length === 1 && available > 0,
    variantId: product.variants.length === 1 ? product.variants[0]!.id : variant?.id ?? null,
  };
}

const publicProduct = {
  status: "APPROVED" as const,
  deletedAt: null,
  seller: { status: "APPROVED" as const, store: { is: { active: true } } },
};

export const getVisibleCategories = cache(async () => {
  return prisma.category.findMany({ where: { visible: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
});

export function categoryIds(all: { id: string; parentId: string | null }[], rootId: string) {
  const ids = [rootId];
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const category of all) {
      if (category.parentId === current) {
        ids.push(category.id);
        queue.push(category.id);
      }
    }
  }
  return ids;
}

export async function browseProducts(input: {
  q?: string;
  categoryIds?: string[];
  brandSlug?: string;
  storeSlug?: string;
  sellerId?: string;
  sort?: string;
  page: number;
  minPesewas?: number;
  maxPesewas?: number;
  rating?: number;
  availability?: "in" | "out";
  discount?: boolean;
  attrs: { name: string; value: string }[];
}) {
  const where: Prisma.ProductWhereInput = { ...publicProduct };
  if (input.categoryIds?.length) where.categoryId = { in: input.categoryIds };
  if (input.brandSlug) where.brand = { slug: input.brandSlug, visible: true };
  if (input.storeSlug) where.seller = { status: "APPROVED", store: { is: { slug: input.storeSlug, active: true } } };
  if (input.sellerId) where.sellerId = input.sellerId;
  if (input.minPesewas != null || input.maxPesewas != null) {
    where.fromPrice = {
      gte: input.minPesewas != null ? input.minPesewas / 100 : undefined,
      lte: input.maxPesewas != null ? input.maxPesewas / 100 : undefined,
    };
  }
  if (input.rating) where.ratingAverage = { gte: input.rating };
  if (input.availability === "in") where.variants = { some: { active: true, inventory: { is: { available: { gt: 0 } } } } };
  if (input.availability === "out") where.NOT = { variants: { some: { active: true, inventory: { is: { available: { gt: 0 } } } } } };
  for (const attribute of input.attrs) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { attributes: { some: { name: attribute.name, value: attribute.value } } }];
  }

  const q = input.q?.trim();
  if (q) {
    const like = { contains: q, mode: "insensitive" as const };
    where.OR = [{ name: like }, { description: like }, { brand: { name: like } }, { seller: { store: { is: { name: like } } } }];
    try {
      const ranked = await prisma.$queryRaw<{ id: string }[]>`
        SELECT p.id
        FROM "Product" p
        LEFT JOIN "Brand" b ON b.id = p."brandId"
        LEFT JOIN "SellerProfile" sp ON sp.id = p."sellerId"
        LEFT JOIN "SellerStore" ss ON ss."sellerId" = sp.id
        WHERE p.status = 'APPROVED' AND p."deletedAt" IS NULL
          AND (
            similarity(p.name, ${q}) > 0.18
            OR p.name ILIKE ${"%" + q + "%"}
            OR COALESCE(b.name, '') ILIKE ${"%" + q + "%"}
            OR COALESCE(ss.name, '') ILIKE ${"%" + q + "%"}
          )
        ORDER BY GREATEST(similarity(p.name, ${q}), similarity(COALESCE(b.name, ''), ${q})) DESC
        LIMIT 200
      `;
      where.id = { in: ranked.map((row) => row.id) };
    } catch {
      // Full-text similarity needs pg_trgm. The ILIKE filters above still run.
    }
  }

  if (input.discount) {
    const discounted = await prisma.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT v."productId" AS id
      FROM "ProductVariant" v
      WHERE v.active = true AND v."compareAtPrice" IS NOT NULL AND v."compareAtPrice" > v.price
    `;
    const ids = discounted.map((row) => row.id);
    where.id = where.id && typeof where.id === "object" && "in" in where.id
      ? { in: (where.id.in as string[]).filter((id) => ids.includes(id)) }
      : { in: ids };
  }

  const sort = input.sort ?? (q ? "relevance" : "newest");
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc" ? { fromPrice: "asc" } :
    sort === "price_desc" ? { fromPrice: "desc" } :
    sort === "rating" ? { ratingAverage: "desc" } :
    sort === "bestselling" ? { salesCount: "desc" } :
    sort === "newest" ? { createdAt: "desc" } :
    { salesCount: "desc" };

  const skip = (input.page - 1) * pageSize;
  const [total, rows, brands, sellers, attributes] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, include: cardInclude, orderBy, skip, take: pageSize }),
    prisma.brand.findMany({ where: { visible: true, products: { some: where } }, orderBy: { name: "asc" }, take: 40 }),
    prisma.sellerStore.findMany({
      where: { active: true, seller: { status: "APPROVED", products: { some: where } } },
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
      take: 40,
    }),
    prisma.productAttribute.groupBy({
      by: ["name", "value"],
      where: { product: where },
      _count: { _all: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    total,
    page: input.page,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    products: rows.map(toCard),
    brands,
    sellers,
    attributes: attributes.map((row) => ({ name: row.name, value: row.value, count: row._count._all })),
  };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, ...publicProduct },
    include: {
      brand: true,
      category: { include: { parent: true } },
      images: { orderBy: { sortOrder: "asc" } },
      attributes: { orderBy: { name: "asc" } },
      seller: { include: { store: true } },
      variants: { where: { active: true }, include: { inventory: true }, orderBy: { price: "asc" } },
      reviews: { where: { status: "PUBLISHED" }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 },
      questions: { where: { status: "PUBLISHED" }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function relatedProducts(productId: string, categoryId: string, sellerId: string) {
  const [related, sameSeller, paired] = await Promise.all([
    prisma.product.findMany({ where: { ...publicProduct, categoryId, id: { not: productId } }, include: cardInclude, take: 4, orderBy: { salesCount: "desc" } }),
    prisma.product.findMany({ where: { ...publicProduct, sellerId, id: { not: productId } }, include: cardInclude, take: 4, orderBy: { createdAt: "desc" } }),
    prisma.$queryRaw<{ id: string }[]>`
      SELECT oi2."productId" AS id, COUNT(*)::int AS count
      FROM "OrderItem" oi
      JOIN "OrderItem" oi2 ON oi2."orderId" = oi."orderId" AND oi2."productId" <> oi."productId"
      WHERE oi."productId" = ${productId}
      GROUP BY oi2."productId"
      ORDER BY count DESC
      LIMIT 3
    `.catch(() => [] as { id: string }[]),
  ]);
  const together = paired.length
    ? await prisma.product.findMany({ where: { ...publicProduct, id: { in: paired.map((row) => row.id) } }, include: cardInclude })
    : [];
  return { related: related.map(toCard), sameSeller: sameSeller.map(toCard), together: together.map(toCard) };
}

async function rail(where: Prisma.ProductWhereInput, orderBy: Prisma.ProductOrderByWithRelationInput, take = 8) {
  const rows = await prisma.product.findMany({ where: { ...publicProduct, ...where }, include: cardInclude, orderBy, take });
  return rows.map(toCard);
}

export async function getHome() {
  try {
    const site = await prisma.siteConfiguration.findUnique({ where: { id: "default" } });
    if (!site) return { status: "unconfigured" as const };
    const now = new Date();
    const [categories, promotions, brands, stores, bestRaw, newest, featured, offers] = await Promise.all([
      getVisibleCategories(),
      prisma.promotion.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
      prisma.brand.findMany({ where: { visible: true, featured: true }, orderBy: { name: "asc" }, take: 8 }),
      prisma.sellerStore.findMany({ where: { active: true, seller: { status: "APPROVED" } }, include: { seller: { select: { status: true } } }, take: 6, orderBy: { name: "asc" } }),
      rail({ salesCount: { gt: 0 } }, { salesCount: "desc" }),
      rail({}, { createdAt: "desc" }),
      rail({ isFeatured: true }, { publishedAt: "desc" }),
      rail({ compareFromPrice: { not: null } }, { createdAt: "desc" }),
    ]);
    const live = promotions.filter((promo) => isPromotionLive(promo, now) && safeHref(promo.ctaHref));
    return {
      status: "ready" as const,
      site,
      categories,
      promotions: live,
      brands,
      stores,
      bestSellers: bestRaw.length > 0 ? bestRaw : [],
      newest,
      featured: featured.length > 0 ? featured : newest.slice(0, 4),
      offers,
      salesExist: bestRaw.length > 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/connect|ECONNREFUSED|P1001|database|Can't reach/i.test(message) || (error && typeof error === "object" && "code" in error && String(error.code).startsWith("P1"))) {
      return { status: "offline" as const };
    }
    throw error;
  }
}

function safeHref(href: string | null) {
  if (!href) return true;
  return href.startsWith("/") && !href.startsWith("//");
}
