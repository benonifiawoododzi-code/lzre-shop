"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureGuestKey, getCurrentUser, readGuestKey } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/security/rate-limit";

async function identity() {
  const user = await getCurrentUser();
  const guestKey = user ? await readGuestKey() : await ensureGuestKey();
  return { user, guestKey };
}

async function cartFor(userId: string | null, guestKey: string | null) {
  if (userId) {
    return prisma.cart.upsert({ where: { userId }, update: {}, create: { userId } });
  }
  if (!guestKey) throw new Error("Cart session missing.");
  return prisma.cart.upsert({ where: { guestKey }, update: {}, create: { guestKey } });
}

export async function addToCartAction(formData: FormData) {
  const variantId = String(formData.get("variantId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  if (!variantId || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) return;
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { inventory: true, product: { include: { seller: { include: { store: true } } } } },
  });
  if (!variant || !variant.active || variant.product.status !== "APPROVED" || variant.product.deletedAt) return;
  if (variant.product.seller.status !== "APPROVED" || !variant.product.seller.store?.active) return;
  const available = variant.inventory?.available ?? 0;
  if (available < 1) return;
  const { user, guestKey } = await identity();
  const cart = await cartFor(user?.id ?? null, guestKey);
  const existing = await prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
  const next = Math.min(available, 20, (existing?.quantity ?? 0) + quantity);
  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    update: { quantity: next, savedForLater: false },
    create: { cartId: cart.id, productId: variant.productId, variantId, quantity: next },
  });
  revalidatePath("/cart");
}

export async function updateCartItemAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  const { user, guestKey } = await identity();
  const item = await prisma.cartItem.findFirst({
    where: { id, cart: user ? { userId: user.id } : { guestKey: guestKey ?? "__none__" } },
    include: { variant: { include: { inventory: true } } },
  });
  if (!item) return;
  const available = item.variant.inventory?.available ?? 0;
  const next = Math.min(Math.max(1, quantity), 20, available);
  if (next < 1) return;
  await prisma.cartItem.update({ where: { id }, data: { quantity: next } });
  revalidatePath("/cart");
}

export async function removeCartItemAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { user, guestKey } = await identity();
  await prisma.cartItem.deleteMany({ where: { id, cart: user ? { userId: user.id } : { guestKey: guestKey ?? "__none__" } } });
  revalidatePath("/cart");
}

export async function saveForLaterAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { user, guestKey } = await identity();
  await prisma.cartItem.updateMany({ where: { id, cart: user ? { userId: user.id } : { guestKey: guestKey ?? "__none__" } }, data: { savedForLater: true } });
  revalidatePath("/cart");
}

export async function moveSavedToCartAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { user, guestKey } = await identity();
  await prisma.cartItem.updateMany({ where: { id, cart: user ? { userId: user.id } : { guestKey: guestKey ?? "__none__" } }, data: { savedForLater: false } });
  revalidatePath("/cart");
}

export async function applyCouponAction(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const { user, guestKey } = await identity();
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.active) return;
  const cart = await cartFor(user?.id ?? null, guestKey);
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: code } });
  revalidatePath("/cart");
}

export async function removeCouponAction() {
  const { user, guestKey } = await identity();
  const cart = user ? await prisma.cart.findUnique({ where: { userId: user.id } }) : guestKey ? await prisma.cart.findUnique({ where: { guestKey } }) : null;
  if (!cart) return;
  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  revalidatePath("/cart");
}

async function wishlistFor(userId: string | null, guestKey: string | null) {
  if (userId) return prisma.wishlist.upsert({ where: { userId }, update: {}, create: { userId } });
  if (!guestKey) throw new Error("Wishlist session missing.");
  return prisma.wishlist.upsert({ where: { guestKey }, update: {}, create: { guestKey } });
}

export async function toggleWishlistAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  if (!productId) return;
  const product = await prisma.product.findFirst({ where: { id: productId, status: "APPROVED", deletedAt: null } });
  if (!product) return;
  const { user, guestKey } = await identity();
  const wishlist = await wishlistFor(user?.id ?? null, guestKey);
  const existing = await prisma.wishlistItem.findUnique({ where: { wishlistId_productId: { wishlistId: wishlist.id, productId } } });
  if (existing) await prisma.wishlistItem.delete({ where: { id: existing.id } });
  else await prisma.wishlistItem.create({ data: { wishlistId: wishlist.id, productId } });
  revalidatePath("/wishlist");
}

export async function moveWishlistToCartAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const variant = await prisma.productVariant.findFirst({ where: { productId, isDefault: true, active: true } });
  if (!variant) return;
  const data = new FormData();
  data.set("variantId", variant.id);
  data.set("quantity", "1");
  await addToCartAction(data);
  await toggleWishlistAction(formData);
  redirect("/cart");
}

export async function buyNowAction(formData: FormData) {
  await addToCartAction(formData);
  redirect("/checkout");
}

export async function mergeGuestCommerce(userId: string) {
  const guestKey = await readGuestKey();
  if (!guestKey) return;
  if (!rateLimit(`merge:${userId}`, 10, 60_000).allowed) return;
  const guestCart = await prisma.cart.findUnique({ where: { guestKey }, include: { items: true } });
  if (guestCart) {
    const cart = await prisma.cart.upsert({ where: { userId }, update: {}, create: { userId, couponCode: guestCart.couponCode } });
    for (const item of guestCart.items) {
      const existing = await prisma.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId: item.variantId } } });
      if (existing) await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: Math.min(20, existing.quantity + item.quantity), savedForLater: existing.savedForLater && item.savedForLater } });
      else await prisma.cartItem.create({ data: { cartId: cart.id, productId: item.productId, variantId: item.variantId, quantity: item.quantity, savedForLater: item.savedForLater } });
    }
    await prisma.cart.delete({ where: { id: guestCart.id } });
  }
  const guestWishlist = await prisma.wishlist.findUnique({ where: { guestKey }, include: { items: true } });
  if (guestWishlist) {
    const wishlist = await prisma.wishlist.upsert({ where: { userId }, update: {}, create: { userId } });
    for (const item of guestWishlist.items) {
      await prisma.wishlistItem.upsert({
        where: { wishlistId_productId: { wishlistId: wishlist.id, productId: item.productId } },
        update: {},
        create: { wishlistId: wishlist.id, productId: item.productId, variantId: item.variantId },
      });
    }
    await prisma.wishlist.delete({ where: { id: guestWishlist.id } });
  }
}
