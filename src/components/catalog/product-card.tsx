import Link from "next/link";
import { Price } from "@/components/ui/price";
import { Rating } from "@/components/ui/rating";
import { addToCartAction, toggleWishlistAction } from "@/actions/cart";
import type { ProductCard } from "@/types/catalog";

export function ProductCardView({ product, layout = "grid" }: { product: ProductCard; layout?: "grid" | "list" }) {
  const stock = product.available < 1 ? "Out of stock" : product.available <= 5 ? `Only ${product.available} left` : "In stock";
  return (
    <article className={layout === "list" ? "grid gap-4 border-b border-line py-5 sm:grid-cols-[160px_1fr]" : "border-b border-line py-4"}>
      <Link href={`/products/${product.slug}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={product.imageAlt} className="aspect-square w-full bg-sand object-cover" src={product.image} />
      </Link>
      <div className="mt-3">
        {product.brand ? <p className="text-xs uppercase tracking-[0.14em] text-muted">{product.brand}</p> : null}
        <h3 className="mt-1 font-display text-lg leading-tight"><Link href={`/products/${product.slug}`}>{product.name}</Link></h3>
        {product.sellerSlug ? <p className="mt-1 text-sm text-muted">Sold by <Link className="underline-offset-4 hover:underline" href={`/stores/${product.sellerSlug}`}>{product.sellerName}</Link></p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Price amount={product.pricePesewas} compare={product.comparePesewas} currency={product.currency} />
          {product.discountPercent ? <span className="text-sm text-success">{product.discountPercent}% off</span> : null}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <Rating count={product.ratingCount} value={product.rating} />
          <p className="text-sm text-muted">{stock}</p>
        </div>
        <div className="mt-3 flex gap-4 text-sm">
          <form action={toggleWishlistAction}>
            <input name="productId" type="hidden" value={product.id} />
            <button className="underline-offset-4 hover:underline" type="submit">Save</button>
          </form>
          {product.canQuickAdd && product.variantId ? (
            <form action={addToCartAction}>
              <input name="variantId" type="hidden" value={product.variantId} />
              <input name="quantity" type="hidden" value="1" />
              <button className="font-semibold text-signal-ink underline-offset-4 hover:underline" type="submit">Add to cart</button>
            </form>
          ) : (
            <Link className="font-semibold text-signal-ink" href={`/products/${product.slug}`}>View options</Link>
          )}
        </div>
      </div>
    </article>
  );
}
