import Link from "next/link";
import type { ReactNode } from "react";
import { Headphones, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { CategoryIcon } from "@/components/catalog/category-icon";
import { ProductCardView } from "@/components/catalog/product-card";
import { Button } from "@/components/ui/button";
import { getHome } from "@/lib/catalog/browse";
import { isPromotionLive } from "@/lib/security/tokens";
import { RecentlyViewed } from "@/components/catalog/recently-viewed";
import type { ProductCard } from "@/types/catalog";

export default async function HomePage() {
  const home = await getHome();
  if (home.status !== "ready") {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-xs uppercase tracking-[0.16em] text-signal-ink">LZRE Books</p>
        <h1 className="mt-3 font-display text-4xl text-navy">The marketplace database is not ready.</h1>
        <p className="mt-4 text-muted">
          {home.status === "offline"
            ? "PostgreSQL is not reachable. Start the database, then run the migration and seed."
            : "The database is reachable, but the marketplace settings have not been seeded."}
        </p>
        <ol className="mt-6 grid gap-2 text-sm">
          <li>1. Copy `.env.example` to `.env` and set `AUTH_SECRET`.</li>
          <li>2. Start PostgreSQL, or set `DATABASE_URL` to your Supabase connection string.</li>
          <li>3. Run `npx prisma migrate deploy` and `npm run db:seed`.</li>
          <li>4. Create an administrator with `npm run admin:create`.</li>
        </ol>
      </section>
    );
  }

  const announcement = home.promotions.find((promo) => promo.placement === "ANNOUNCEMENT" && isPromotionLive(promo, new Date()));
  const hero = home.promotions.find((promo) => promo.placement === "HERO" && isPromotionLive(promo, new Date()));
  const parents = home.categories.filter((category) => !category.parentId);
  const spotlightSlugs = ["fiction", "childrens-books", "school-books"];
  const spotlight = spotlightSlugs.map((slug) => parents.find((category) => category.slug === slug)).filter((category) => category != null);
  const tiles = spotlight.length > 0 ? spotlight : parents.slice(0, 3);
  const heroProducts = [...home.featured, ...home.newest.filter((product) => !home.featured.some((item) => item.id === product.id))].slice(0, 4);
  const tileStyles = ["bg-navy text-ivory", "bg-paper text-navy", "bg-blush text-navy"];

  return (
    <div>
      {announcement?.title || home.site.announcementActive ? (
        <p className="bg-sand px-4 py-2 text-center text-sm text-navy">{announcement?.title ?? home.site.announcement}</p>
      ) : null}
      <section className="bg-paper">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-2">
          <div className="min-w-0">
            {hero?.badge || home.site.heroBadge ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal">{hero?.badge || home.site.heroBadge}</p> : null}
            <h1 className="mt-3 max-w-xl font-display text-5xl leading-none text-navy md:text-6xl">{hero?.title || home.site.heroTitle}</h1>
            <p className="mt-5 max-w-lg text-lg text-muted">{hero?.subtitle || home.site.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href={hero?.ctaHref || home.site.heroPrimaryHref}>{hero?.ctaLabel || home.site.heroPrimaryLabel}</Button>
              <Button href={home.site.heroSecondaryHref} variant="secondary">{home.site.heroSecondaryLabel}</Button>
            </div>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-4 rounded-[2rem] bg-ivory p-4">
            {heroProducts.map((product) => (
              <Link className="overflow-hidden rounded-2xl bg-paper" href={`/products/${product.slug}`} key={product.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={product.imageAlt} className="aspect-square w-full object-cover" src={product.image} />
              </Link>
            ))}
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl gap-4 px-4 pb-10 sm:grid-cols-2 lg:grid-cols-4">
          <Trust icon={<Truck className="size-5" />} text="Confirmed at checkout" title="Delivery over GH₵500 is free" />
          <Trust icon={<ShieldCheck className="size-5" />} text="Prices are calculated on the server" title="Secure checkout" />
          <Trust icon={<RotateCcw className="size-5" />} text="Request one after delivery" title="Returns" />
          <Trust icon={<Headphones className="size-5" />} text={home.site.supportEmail} title="Support" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl text-navy">Shop by category</h2>
          <Link className="text-sm font-semibold text-signal-ink" href="/categories">View all categories</Link>
        </div>
        <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
          {parents.slice(0, 10).map((category) => (
            <Link className="grid w-24 shrink-0 justify-items-center gap-2 text-center text-sm" href={`/categories/${category.slug}`} key={category.id}>
              <span className="grid size-16 place-items-center rounded-full bg-paper text-navy shadow-sm"><CategoryIcon className="size-6" name={category.icon} /></span>
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <ProductRail href="/products" products={[...home.featured, ...home.newest.filter((product) => !home.featured.some((item) => item.id === product.id))].slice(0, 4)} title="Featured books" />

      {tiles.length > 0 ? (
        <section className="mx-auto grid max-w-6xl gap-4 px-4 py-4 md:grid-cols-3">
          {tiles.map((category, index) => (
            <Link className={`flex min-h-52 flex-col justify-between rounded-3xl p-6 ${tileStyles[index % tileStyles.length]}`} href={`/categories/${category.slug}`} key={category.id}>
              <div>
                <CategoryIcon className="size-6" name={category.icon} />
                <h2 className="mt-6 font-display text-3xl">{category.name}</h2>
              </div>
              <span className="text-sm font-semibold">Shop now</span>
            </Link>
          ))}
        </section>
      ) : null}

      <ProductRail href="/products?sort=newest" note={home.salesExist ? undefined : "Newest approved products."} products={home.newest} title="New arrivals" />
      <ProductRail href="/products?sort=bestselling" note={home.salesExist ? "Ranked by completed sales." : "No completed sales yet."} products={home.salesExist ? home.bestSellers : home.newest.slice(0, 4)} title="Best sellers" />
      {home.offers.length > 0 ? <ProductRail href="/products?discount=1" note="Compare-at prices are shown only when they are higher than the current price." products={home.offers} title="Deals" /> : null}

      {home.brands.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="rounded-3xl bg-paper px-6 py-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-2xl text-navy">Brands</h2>
              <Link className="text-sm font-semibold text-signal-ink" href="/brands">View all</Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {home.brands.map((brand) => <Link className="rounded-full border border-line px-4 py-2 text-sm font-semibold" href={`/brands/${brand.slug}`} key={brand.id}>{brand.name}</Link>)}
            </div>
          </div>
        </section>
      ) : null}

      {home.stores.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 py-4">
          <h2 className="font-display text-3xl text-navy">Sellers</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {home.stores.map((store) => (
              <Link className="rounded-3xl border border-line bg-paper p-5" href={`/stores/${store.slug}`} key={store.id}>
                <p className="font-display text-2xl text-navy">{store.name}</p>
                <p className="mt-2 text-sm text-muted">{store.description}</p>
                <p className="mt-3 text-sm">{store.ratingCount > 0 ? `${Number(store.ratingAverage).toFixed(1)} from ${store.ratingCount} reviews` : "No seller rating yet"}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <RecentlyViewed />
    </div>
  );
}

function Trust({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-ivory p-4">
      <span className="text-navy">{icon}</span>
      <div>
        <p className="font-semibold text-navy">{title}</p>
        <p className="text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}

function ProductRail({ title, note, products, href }: { title: string; note?: string; products: ProductCard[]; href: string }) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-navy">{title}</h2>
          {note ? <p className="mt-2 text-sm text-muted">{note}</p> : null}
        </div>
        <Link className="text-sm font-semibold text-signal-ink" href={href}>View all</Link>
      </div>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.slice(0, 4).map((product) => <ProductCardView key={product.id} product={product} />)}
      </div>
    </section>
  );
}
