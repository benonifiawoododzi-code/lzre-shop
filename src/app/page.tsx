import Link from "next/link";
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
        <p className="text-xs uppercase tracking-[0.16em] text-signal-ink">LZRE</p>
        <h1 className="mt-3 font-display text-4xl text-navy">The marketplace database is not ready.</h1>
        <p className="mt-4 text-muted">
          {home.status === "offline"
            ? "PostgreSQL is not reachable. Start the database, then run the migration and seed."
            : "The database is reachable, but the marketplace settings have not been seeded."}
        </p>
        <ol className="mt-6 grid gap-2 text-sm">
          <li>1. Copy `.env.example` to `.env` and set `AUTH_SECRET`.</li>
          <li>2. Start PostgreSQL with `docker compose up -d`.</li>
          <li>3. Run `npx prisma migrate deploy` and `npm run db:seed`.</li>
          <li>4. Create an administrator with `npm run admin:create`.</li>
        </ol>
      </section>
    );
  }

  const announcement = home.promotions.find((promo) => promo.placement === "ANNOUNCEMENT" && isPromotionLive(promo, new Date()));
  const hero = home.promotions.find((promo) => promo.placement === "HERO" && isPromotionLive(promo, new Date()));
  const banners = home.promotions.filter((promo) => promo.placement === "BANNER" && isPromotionLive(promo, new Date()));
  const parents = home.categories.filter((category) => !category.parentId);
  const announcementText = announcement?.title ?? (home.site.announcementActive ? home.site.announcement : null);

  return (
    <div>
      {announcementText ? <p className="bg-navy px-4 py-2 text-center text-sm text-ivory">{announcementText}</p> : null}
      <section className="bg-navy text-ivory">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            {hero?.badge || home.site.heroBadge ? <p className="text-xs uppercase tracking-[0.18em] text-ivory/70">{hero?.badge || home.site.heroBadge}</p> : null}
            <h1 className="mt-4 max-w-xl font-display text-5xl leading-none md:text-6xl">{hero?.title || home.site.heroTitle}</h1>
            <p className="mt-5 max-w-lg text-lg text-ivory/80">{hero?.subtitle || home.site.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href={hero?.ctaHref || home.site.heroPrimaryHref} variant="inverse">{hero?.ctaLabel || home.site.heroPrimaryLabel}</Button>
              <Button className="border-ivory text-ivory hover:bg-ivory hover:text-navy" href={home.site.heroSecondaryHref} variant="secondary">{home.site.heroSecondaryLabel}</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {parents.slice(0, 4).map((category) => (
              <Link className="min-h-36 bg-navy-soft p-4" href={`/categories/${category.slug}`} key={category.id}>
                <CategoryIcon className="size-5" name={category.icon} />
                <p className="mt-8 font-display text-2xl">{category.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl text-navy">Shop by category</h2>
          <Link className="text-sm underline-offset-4 hover:underline" href="/categories">All categories</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-px bg-line md:grid-cols-4">
          {parents.map((category) => (
            <Link className="flex min-h-28 flex-col justify-between bg-ivory p-4 hover:bg-paper" href={`/categories/${category.slug}`} key={category.id}>
              <CategoryIcon className="size-5 text-navy" name={category.icon} />
              <span className="font-medium">{category.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <ProductRail note={home.salesExist ? "Ranked by completed sales." : "No completed sales yet. These are the newest approved products."} products={home.salesExist ? home.bestSellers : home.newest} title={home.salesExist ? "Best sellers" : "New in the catalog"} />
      <ProductRail products={home.featured} title="Featured" />
      {home.offers.length > 0 ? <ProductRail note="Compare-at prices are shown only when they are higher than the current price." products={home.offers} title="Special offers" /> : null}

      {banners.map((banner) => (
        <section className="mx-auto mt-10 grid max-w-6xl gap-6 border-y border-line px-4 py-10 md:grid-cols-[1.2fr_0.8fr]" key={banner.id}>
          <div>
            <h2 className="font-display text-4xl text-navy">{banner.title}</h2>
            {banner.subtitle ? <p className="mt-3 max-w-lg text-muted">{banner.subtitle}</p> : null}
            {banner.ctaHref && banner.ctaLabel ? <div className="mt-6"><Button href={banner.ctaHref}>{banner.ctaLabel}</Button></div> : null}
          </div>
          {banner.imageUrl ? <img alt="" className="h-56 w-full object-cover" src={banner.imageUrl} /> : <div className="bg-sand" />}
        </section>
      ))}

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-3xl text-navy">Sellers</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {home.stores.map((store) => (
            <Link className="border-t border-navy pt-4" href={`/stores/${store.slug}`} key={store.id}>
              <p className="font-display text-2xl">{store.name}</p>
              <p className="mt-2 text-sm text-muted">{store.description}</p>
              <p className="mt-3 text-sm">{store.ratingCount > 0 ? `${Number(store.ratingAverage).toFixed(1)} from ${store.ratingCount} reviews` : "No seller rating yet"}</p>
            </Link>
          ))}
        </div>
      </section>

      {home.brands.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-4">
          <h2 className="font-display text-3xl text-navy">Brands</h2>
          <div className="mt-4 flex flex-wrap gap-4">
            {home.brands.map((brand) => <Link className="border border-line px-4 py-2" href={`/brands/${brand.slug}`} key={brand.id}>{brand.name}</Link>)}
          </div>
        </section>
      ) : null}
      <RecentlyViewed />
    </div>
  );
}

function ProductRail({ title, note, products }: { title: string; note?: string; products: ProductCard[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <h2 className="font-display text-3xl text-navy">{title}</h2>
      {note ? <p className="mt-2 text-sm text-muted">{note}</p> : null}
      <div className="mt-4 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => <ProductCardView key={product.id} product={product} />)}
      </div>
    </section>
  );
}
