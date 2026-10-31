import Link from "next/link";
import { moveWishlistToCartAction, toggleWishlistAction } from "@/actions/cart";
import { EmptyState } from "@/components/ui/empty-state";
import { toCard, cardInclude } from "@/lib/catalog/browse";
import { getCurrentUser, readGuestKey } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { ProductCardView } from "@/components/catalog/product-card";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const user = await getCurrentUser();
  const guestKey = await readGuestKey();
  const wishlist = user
    ? await prisma.wishlist.findUnique({ where: { userId: user.id }, include: { items: { include: { product: { include: cardInclude } } } } })
    : guestKey
      ? await prisma.wishlist.findUnique({ where: { guestKey }, include: { items: { include: { product: { include: cardInclude } } } } })
      : null;
  const items = wishlist?.items.filter((item) => item.product.status === "APPROVED" && !item.product.deletedAt) ?? [];
  if (items.length === 0) {
    return <div className="mx-auto max-w-3xl px-4 py-10"><EmptyState action="Browse products" body="Save products here. A guest list stays in this browser session and merges when you sign in." href="/products" title="Your wishlist is empty" /></div>;
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-4xl text-navy">Wishlist</h1>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.id}>
            <ProductCardView product={toCard(item.product)} />
            <div className="flex gap-3 text-sm">
              <form action={moveWishlistToCartAction}><input name="productId" type="hidden" value={item.productId} /><button type="submit">Move to cart</button></form>
              <form action={toggleWishlistAction}><input name="productId" type="hidden" value={item.productId} /><button type="submit">Remove</button></form>
            </div>
            <Link className="text-sm text-muted" href={`/products/${item.product.slug}`}>{item.product.variants.some((variant) => (variant.inventory?.available ?? 0) > 0) ? "Available" : "Currently unavailable"}</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
