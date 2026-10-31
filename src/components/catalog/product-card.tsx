import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { Price } from "@/components/ui/price";
import { Rating } from "@/components/ui/rating";
import { addToCartAction, toggleWishlistAction } from "@/actions/cart";
import type { ProductCard } from "@/types/catalog";

export function ProductCardView({ product, layout = "grid" }: { product: ProductCard; layout?: "grid" | "list" }) {
  const stock = product.available < 1 ? "Out of stock" : product.available <= 5 ? `Only ${product.available} left` : "In stock";
  return (
    <article className={layout === "list" ? "grid gap-4 rounded-2xl border border-line bg-paper p-3 shadow-sm sm:grid-cols-[160px_1fr]" : "rounded-2xl border border-line bg-paper p-3 shadow-sm"}>
      <div className="relative">
        <Link href={`/products/${product.slug}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={product.imageAlt} className="aspect-square w-full rounded-xl bg-sand object-cover" src={product.image} />
        </Link>
        {product.discountPercent ? <span className="absolute left-2 top-2 rounded-full bg-navy px-2 py-1 text-xs font-semibold text-ivory">{product.discountPercent}% off</span> : null}
        <form action={toggleWishlistAction} className="absolute right-2 top-2">
          <input name="productId" type="hidden" value={product.id} />
          <button aria-label={`Save ${product.name}`} className="grid size-9 place-items-center rounded-full bg-paper text-navy shadow-sm" type="submit"><Heart className="size-4" /></button>
        </form>
      </div>
      <div className="mt-3 flex flex-1 flex-col">
        {product.brand ? <p className="text-xs uppercase tracking-[0.14em] text-muted">{product.brand}</p> : null}
        <h3 className="mt-1 font-display text-lg leading-tight"><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
        {product.sellerSlug ? <p className="mt-1 text-sm text-muted">Sold by <Link className="underline-offset-4 hover:underline" href={`/stores/${product.sellerSlug}`}>{product.sellerName}</Link></p> : null}
        <div className="mt-2"><Rating count={product.ratingCount} value={product.rating} /></div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            <Price amount={product.pricePesewas} compare={product.comparePesewas} currency={product.currency} />
            <p className="text-xs text-muted">{stock}</p>
          </div>
          {product.canQuickAdd && product.variantId ? (
            <form action={addToCartAction}>
              <input name="variantId" type="hidden" value={product.variantId} />
              <input name="quantity" type="hidden" value="1" />
              <button aria-label={`Add ${product.name} to cart`} className="grid size-10 place-items-center rounded-full bg-navy text-ivory" type="submit"><ShoppingBag className="size-4" /></button>
            </form>
          ) : (
            <Link aria-label={`View options for ${product.name}`} className="grid size-10 place-items-center rounded-full bg-navy text-ivory" href={`/products/${product.slug}`}><ShoppingBag className="size-4" /></Link>
          )}
        </div>
      </div>
    </article>
  );
}
