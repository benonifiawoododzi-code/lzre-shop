"use client";

import { useState } from "react";
import { addToCartAction, buyNowAction, toggleWishlistAction } from "@/actions/cart";
import { Price } from "@/components/ui/price";

type Variant = { id: string; name: string; pricePesewas: number; comparePesewas: number | null; available: number; options: Record<string, string> };

export function BuyBox({ productId, currency, variants }: { productId: string; currency: string; variants: Variant[] }) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const variant = variants.find((item) => item.id === variantId) ?? variants[0];
  if (!variant) return <p>This product has no purchasable options.</p>;
  const optionNames = [...new Set(variants.flatMap((item) => Object.keys(item.options)))];
  return (
    <div className="grid gap-4">
      <Price amount={variant.pricePesewas} compare={variant.comparePesewas} currency={currency} className="text-2xl" />
      <p className="text-sm">{variant.available > 0 ? `${variant.available} available` : "Out of stock"}</p>
      {optionNames.map((name) => (
        <fieldset key={name}>
          <legend className="text-sm font-medium">{name}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {[...new Set(variants.map((item) => item.options[name]).filter(Boolean))].map((value) => {
              const match = variants.find((item) => item.options[name] === value && Object.entries(variant.options).every(([key, current]) => key === name || item.options[key] === current));
              return (
                <button className={`min-h-11 border px-3 ${variant.options[name] === value ? "border-navy bg-navy text-ivory" : "border-line"}`} disabled={!match} key={value} onClick={() => match && setVariantId(match.id)} type="button">{value}</button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="flex items-center gap-3">
        <button aria-label="Decrease quantity" className="size-11 border border-line" onClick={() => setQuantity((value) => Math.max(1, value - 1))} type="button">-</button>
        <span aria-live="polite">{quantity}</span>
        <button aria-label="Increase quantity" className="size-11 border border-line" onClick={() => setQuantity((value) => Math.min(variant.available || 1, 20, value + 1))} type="button">+</button>
      </div>
      <form action={addToCartAction} className="flex flex-wrap gap-3">
        <input name="variantId" type="hidden" value={variant.id} />
        <input name="quantity" type="hidden" value={quantity} />
        <button className="h-11 bg-signal px-5 font-semibold text-white disabled:opacity-50" disabled={variant.available < 1} type="submit">Add to cart</button>
      </form>
      <form action={buyNowAction}>
        <input name="variantId" type="hidden" value={variant.id} />
        <input name="quantity" type="hidden" value={quantity} />
        <button className="h-11 border border-navy px-5 font-semibold disabled:opacity-50" disabled={variant.available < 1} type="submit">Buy now</button>
      </form>
      <form action={toggleWishlistAction}>
        <input name="productId" type="hidden" value={productId} />
        <button className="text-sm underline-offset-4 hover:underline" type="submit">Save to wishlist</button>
      </form>
    </div>
  );
}
