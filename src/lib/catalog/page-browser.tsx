import { browseProducts, categoryIds, getVisibleCategories } from "@/lib/catalog/browse";
import { ProductBrowser } from "@/components/catalog/product-browser";
import { prisma } from "@/lib/db";
import { normalizeSearchTerm } from "@/lib/catalog/csv";
import { cedisToPesewas } from "@/lib/pricing/money";
import { one, parsePage } from "@/lib/utils";

export async function loadBrowser(input: {
  title: string;
  description?: string;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  categorySlug?: string;
  brandSlug?: string;
  storeSlug?: string;
  recordSearch?: boolean;
}) {
  const sp = input.searchParams;
  const query = {
    q: one(sp.q),
    sort: one(sp.sort),
    min: one(sp.min),
    max: one(sp.max),
    brand: one(sp.brand),
    seller: one(sp.seller),
    rating: one(sp.rating),
    availability: one(sp.availability),
    discount: one(sp.discount),
    view: one(sp.view),
    page: one(sp.page),
  };
  const attrs = Object.entries(sp)
    .filter(([key]) => key.startsWith("attr_"))
    .map(([key, value]) => ({ name: key.slice(5), value: one(value) ?? "" }))
    .filter((item) => item.value);
  const categories = await getVisibleCategories();
  const current = input.categorySlug ? categories.find((category) => category.slug === input.categorySlug) : null;
  const term = query.q ? normalizeSearchTerm(query.q) : null;
  const min = query.min && /^\d+(\.\d{1,2})?$/.test(query.min) ? cedisToPesewas(query.min) : undefined;
  const max = query.max && /^\d+(\.\d{1,2})?$/.test(query.max) ? cedisToPesewas(query.max) : undefined;
  const result = await browseProducts({
    q: term ?? undefined,
    categoryIds: current ? categoryIds(categories, current.id) : undefined,
    brandSlug: input.brandSlug || query.brand,
    storeSlug: input.storeSlug || query.seller,
    sort: query.sort,
    page: parsePage(query.page),
    minPesewas: min,
    maxPesewas: max,
    rating: query.rating ? Number(query.rating) : undefined,
    availability: query.availability === "in" ? "in" : undefined,
    discount: query.discount === "1",
    attrs,
  });
  if (input.recordSearch && term && parsePage(query.page) === 1) {
    await prisma.searchQuery.upsert({ where: { term: term.toLowerCase() }, update: { count: { increment: 1 } }, create: { term: term.toLowerCase(), count: 1 } });
  }
  const popular = result.products.length === 0 ? (await prisma.searchQuery.findMany({ orderBy: { count: "desc" }, take: 5 })).map((row) => row.term) : [];
  const queryRecord: Record<string, string | undefined> = { ...query, ...Object.fromEntries(attrs.map((attr) => [`attr_${attr.name}`, attr.value])) };
  return (
    <ProductBrowser
      attributes={result.attributes}
      basePath={input.basePath}
      brands={result.brands}
      description={input.description ?? current?.description}
      page={result.page}
      pages={result.pages}
      popular={popular}
      products={result.products}
      query={queryRecord}
      sellers={result.sellers}
      subcategories={current ? categories.filter((category) => category.parentId === current.id).map((category) => ({ name: category.name, slug: category.slug })) : []}
      title={input.title}
      total={result.total}
    />
  );
}
