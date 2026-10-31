import type { Coupon, TaxComponent } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cedisToPesewas } from "@/lib/pricing/money";
import { buildQuote, type Quote } from "@/lib/pricing/quote";
import type { CouponInput } from "@/lib/pricing/coupon";
import type { TaxComponentInput } from "@/lib/pricing/tax";

export const cartInclude = {
  items: {
    include: {
      product: { include: { category: true, seller: { include: { store: true } }, images: { orderBy: { sortOrder: "asc" as const }, take: 1 } } },
      variant: { include: { inventory: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

export function couponInput(coupon: Coupon): CouponInput {
  return {
    code: coupon.code,
    type: coupon.type,
    value: coupon.type === "PERCENTAGE" ? Number(coupon.value) : cedisToPesewas(coupon.value.toString()),
    minMerchandise: coupon.minMerchandise ? cedisToPesewas(coupon.minMerchandise.toString()) : null,
    maxDiscount: coupon.maxDiscount ? cedisToPesewas(coupon.maxDiscount.toString()) : null,
    startsAt: coupon.startsAt,
    endsAt: coupon.endsAt,
    usageLimit: coupon.usageLimit,
    perUserLimit: coupon.perUserLimit,
    usedCount: coupon.usedCount,
    active: coupon.active,
    firstOrderOnly: coupon.firstOrderOnly,
    categoryIds: coupon.categoryIds,
    productIds: coupon.productIds,
    sellerIds: coupon.sellerIds,
  };
}

export function taxInputs(rows: TaxComponent[]): TaxComponentInput[] {
  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    ratePercent: Number(row.ratePercent),
    sequence: row.sequence,
    applyOn: row.applyOn,
  }));
}

export async function findCart(userId: string | null, guestKey: string | null) {
  if (userId) return prisma.cart.findUnique({ where: { userId }, include: cartInclude });
  if (!guestKey) return null;
  return prisma.cart.findUnique({ where: { guestKey }, include: cartInclude });
}

export async function quoteCart(input: { userId: string | null; guestKey: string | null; region?: string; methodCode?: string; couponCode?: string | null }) {
  const [cart, site, taxes] = await Promise.all([
    findCart(input.userId, input.guestKey),
    prisma.siteConfiguration.findUnique({ where: { id: "default" } }),
    prisma.taxComponent.findMany({ where: { active: true }, orderBy: { sequence: "asc" } }),
  ]);
  if (!site) return { error: "The marketplace is not configured yet." as const };
  const activeItems = (cart?.items ?? []).filter((item) => !item.savedForLater);
  const savedItems = (cart?.items ?? []).filter((item) => item.savedForLater);
  const region = input.region;
  const zone = region
    ? await prisma.shippingZone.findFirst({
        where: { active: true, country: site.country, regions: { has: region } },
        include: { rates: { where: { active: true }, include: { method: true } } },
      })
    : null;
  const methods = (zone?.rates ?? []).filter((rate) => rate.method.active).map((rate) => ({
    code: rate.method.code,
    name: rate.method.name,
    description: rate.method.description,
    estimatedMinDays: rate.method.estimatedMinDays,
    estimatedMaxDays: rate.method.estimatedMaxDays,
    pricePesewas: cedisToPesewas(rate.price.toString()),
    currency: rate.currency,
  }));
  const selected = methods.find((method) => method.code === input.methodCode) ?? methods[0] ?? null;
  const selectedRate = zone?.rates.find((rate) => rate.method.code === selected?.code);
  const problems: string[] = [];
  const lines = [];
  for (const item of activeItems) {
    const available = item.variant.inventory?.available ?? 0;
    if (item.product.status !== "APPROVED" || item.product.deletedAt || item.product.seller.status !== "APPROVED" || !item.product.seller.store?.active || !item.variant.active) {
      problems.push(`${item.product.name} is no longer available.`);
      continue;
    }
    if (item.quantity > available) problems.push(`${item.product.name} only has ${available} available.`);
    if (item.product.currency !== site.currency) problems.push(`${item.product.name} uses a different currency.`);
    lines.push({
      key: item.id,
      productId: item.productId,
      categoryId: item.product.categoryId,
      sellerId: item.product.sellerId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: cedisToPesewas(item.variant.price.toString()),
      weightGrams: item.variant.weightGrams ?? item.product.weightGrams,
      sku: item.variant.sku,
      name: item.product.name,
      variantName: item.variant.name,
      sellerName: item.product.seller.store?.name ?? item.product.seller.legalName,
      image: item.product.images[0]?.url ?? `/demo-image/${item.product.slug}`,
      available,
    });
  }

  const code = (input.couponCode ?? cart?.couponCode ?? "").trim().toUpperCase();
  const coupon = code ? await prisma.coupon.findUnique({ where: { code } }) : null;
  const priorOrders = input.userId
    ? await prisma.order.count({ where: { userId: input.userId, status: { not: "CANCELLED" } } })
    : 0;
  const redemptions = coupon && input.userId ? await prisma.couponRedemption.count({ where: { couponId: coupon.id, userId: input.userId } }) : 0;
  const sellerIds = [...new Set(lines.map((line) => line.sellerId))];
  const sellers = sellerIds.length ? await prisma.sellerProfile.findMany({ where: { id: { in: sellerIds } } }) : [];
  const shippingBySeller = Object.fromEntries(sellerIds.map((sellerId) => [sellerId, {
    price: selectedRate ? cedisToPesewas(selectedRate.price.toString()) : 0,
    freeThreshold: selectedRate?.freeThreshold ? cedisToPesewas(selectedRate.freeThreshold.toString()) : null,
    includedWeightGrams: selectedRate?.includedWeightGrams ?? 5000,
    extraPerKg: selectedRate?.extraPerKg ? cedisToPesewas(selectedRate.extraPerKg.toString()) : null,
  }]));
  const quote: Quote = buildQuote({
    lines,
    coupon: coupon ? couponInput(coupon) : null,
    now: new Date(),
    isFirstOrder: priorOrders === 0,
    userRedemptions: redemptions,
    shippingBySeller,
    taxComponents: taxInputs(taxes),
    commissionRateBySeller: Object.fromEntries(sellers.map((seller) => [seller.id, Number(seller.commissionRate ?? site.commissionRate)])),
  });
  if (!region) quote.errors = quote.errors.filter((error) => error !== "Delivery is not available for one of the sellers.");
  if (region && !zone) quote.errors.push("Delivery is not configured for that region.");
  if (problems.length) quote.errors.push(...problems);
  quote.valid = quote.valid && problems.length === 0 && (!region || Boolean(zone && selected));

  return {
    cartId: cart?.id ?? null,
    currency: site.currency,
    lines,
    saved: savedItems.map((item) => ({
      id: item.id,
      name: item.product.name,
      slug: item.product.slug,
      variantName: item.variant.name,
      image: item.product.images[0]?.url ?? `/demo-image/${item.product.slug}`,
    })),
    quote,
    methods,
    selectedMethod: selected?.code ?? null,
    codAllowed: zone?.codAllowed ?? false,
    zoneName: zone?.name ?? null,
    taxDemonstration: taxes.some((tax) => tax.demonstration),
    couponCode: code || null,
    couponError: coupon && quote.errors.find((error) => /coupon/i.test(error)) ? quote.errors.find((error) => /coupon/i.test(error)) : null,
  };
}
