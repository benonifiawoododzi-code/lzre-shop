import Link from "next/link";
import { ProductCardView } from "@/components/catalog/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import type { ProductCard } from "@/types/catalog";

export function ProductBrowser({
  title,
  description,
  basePath,
  query,
  total,
  products,
  page,
  pages,
  brands,
  sellers,
  attributes,
  subcategories,
  popular,
}: {
  title: string;
  description?: string;
  basePath: string;
  query: Record<string, string | undefined>;
  total: number;
  products: ProductCard[];
  page: number;
  pages: number;
  brands: { name: string; slug: string }[];
  sellers: { name: string; slug: string }[];
  attributes: { name: string; value: string; count: number }[];
  subcategories?: { name: string; slug: string }[];
  popular?: string[];
}) {
  const view = query.view === "list" ? "list" : "grid";
  function href(pageNumber: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
    params.set("page", String(pageNumber));
    return `${basePath}?${params.toString()}`;
  }
  const clear = basePath;
  const grouped = attributes.reduce<Record<string, { value: string; count: number }[]>>((map, row) => {
    map[row.name] = [...(map[row.name] ?? []), { value: row.value, count: row.count }];
    return map;
  }, {});

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[240px_1fr]">
      <form className="grid content-start gap-4 text-sm" method="get">
        {query.q ? <input name="q" type="hidden" value={query.q} /> : null}
        <label className="grid gap-1">Sort
          <select className="h-11 border border-line bg-paper px-2" defaultValue={query.sort ?? "relevance"} name="sort">
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="rating">Highest rated</option>
            <option value="bestselling">Best selling</option>
          </select>
        </label>
        <label className="grid gap-1">Minimum price (GHS)<input className="h-11 border border-line px-2" defaultValue={query.min} name="min" inputMode="decimal" /></label>
        <label className="grid gap-1">Maximum price (GHS)<input className="h-11 border border-line px-2" defaultValue={query.max} name="max" inputMode="decimal" /></label>
        <label className="grid gap-1">Brand
          <select className="h-11 border border-line bg-paper px-2" defaultValue={query.brand ?? ""} name="brand">
            <option value="">Any</option>
            {brands.map((brand) => <option key={brand.slug} value={brand.slug}>{brand.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1">Seller
          <select className="h-11 border border-line bg-paper px-2" defaultValue={query.seller ?? ""} name="seller">
            <option value="">Any</option>
            {sellers.map((seller) => <option key={seller.slug} value={seller.slug}>{seller.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1">Rating
          <select className="h-11 border border-line bg-paper px-2" defaultValue={query.rating ?? ""} name="rating">
            <option value="">Any</option>
            <option value="4">4 and up</option>
            <option value="3">3 and up</option>
          </select>
        </label>
        <label className="flex items-center gap-2"><input defaultChecked={query.availability === "in"} name="availability" type="checkbox" value="in" /> In stock</label>
        <label className="flex items-center gap-2"><input defaultChecked={query.discount === "1"} name="discount" type="checkbox" value="1" /> Discounted</label>
        {Object.entries(grouped).map(([name, values]) => (
          <fieldset key={name}>
            <legend className="font-medium">{name}</legend>
            {values.slice(0, 8).map((value) => (
              <label className="mt-1 flex items-center gap-2" key={value.value}>
                <input defaultChecked={query[`attr_${name}`] === value.value} name={`attr_${name}`} type="radio" value={value.value} />
                {value.value} <span className="text-muted">({value.count})</span>
              </label>
            ))}
          </fieldset>
        ))}
        <button className="h-11 bg-navy text-ivory" type="submit">Apply filters</button>
        <Link href={clear}>Clear all</Link>
      </form>
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl text-navy">{title}</h1>
            {description ? <p className="mt-2 max-w-2xl text-muted">{description}</p> : null}
            <p className="mt-2 text-sm text-muted">{total} products</p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href={hrefWith(basePath, query, { view: "grid", page: "1" })}>Grid</Link>
            <Link href={hrefWith(basePath, query, { view: "list", page: "1" })}>List</Link>
          </div>
        </div>
        {subcategories && subcategories.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {subcategories.map((category) => <Link className="border border-line px-3 py-2 text-sm" href={`/categories/${category.slug}`} key={category.slug}>{category.name}</Link>)}
          </div>
        ) : null}
        {products.length === 0 ? (
          <div className="mt-8">
            <EmptyState action="Browse categories" body="Try another search or clear the filters." href="/categories" title="Nothing matches" />
            {popular && popular.length > 0 ? <p className="mt-4 text-sm">Popular searches: {popular.join(", ")}</p> : null}
          </div>
        ) : (
          <div className={view === "grid" ? "mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" : "mt-6 grid gap-5"}>
            {products.map((product) => <ProductCardView key={product.id} layout={view} product={product} />)}
          </div>
        )}
        <Pagination hrefFor={href} page={page} pages={pages} />
      </section>
    </div>
  );
}

function hrefWith(basePath: string, query: Record<string, string | undefined>, extra: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...extra })) if (value) params.set(key, value);
  return `${basePath}?${params.toString()}`;
}
