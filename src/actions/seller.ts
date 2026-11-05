"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { parseProductCsv } from "@/lib/catalog/csv";
import { prisma } from "@/lib/db";
import { notifyUser, audit } from "@/lib/notify";
import { savePrivateFile, savePublicImage } from "@/lib/storage/files";
import { cedisToPesewas, pesewasToDecimal } from "@/lib/pricing/money";
import { canTransitionFulfillment } from "@/lib/orders/transitions";
import { collectCod } from "@/lib/commerce/checkout";
import { releaseStock, restoreCommittedStock, setOnHand } from "@/lib/commerce/stock";
import { slugify } from "@/lib/utils";
import { productSchema, sellerApplicationSchema } from "@/lib/validation/schemas";

async function sellerUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/seller/register");
  return user;
}

export async function applySellerAction(_state: { message: string }, formData: FormData) {
  const user = await sellerUser();
  const parsed = sellerApplicationSchema.safeParse({
    storeName: formData.get("storeName"),
    description: formData.get("description"),
    businessType: formData.get("businessType"),
    legalName: formData.get("legalName"),
    registrationNo: formData.get("registrationNo") ?? "",
    tin: formData.get("tin") ?? "",
    phone: formData.get("phone"),
    city: formData.get("city"),
    region: formData.get("region"),
    payoutType: formData.get("payoutType"),
    bankName: formData.get("bankName") ?? "",
    accountName: formData.get("accountName") ?? "",
    accountNumber: formData.get("accountNumber") ?? "",
    momoNetwork: formData.get("momoNetwork") ?? "",
    momoNumber: formData.get("momoNumber") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the application." };
  if (user.sellerProfile && user.sellerProfile.status !== "REJECTED") return { message: "You already have a seller application." };
  const slug = await uniqueSlug(parsed.data.storeName, async (value) => Boolean(await prisma.sellerStore.findUnique({ where: { slug: value } })));
  const seller = await prisma.sellerProfile.upsert({
    where: { userId: user.id },
    update: {
      status: "PENDING",
      businessType: parsed.data.businessType,
      legalName: parsed.data.legalName,
      registrationNo: parsed.data.registrationNo || null,
      tin: parsed.data.tin || null,
      phone: parsed.data.phone,
      payoutType: parsed.data.payoutType,
      bankName: parsed.data.bankName || null,
      accountName: parsed.data.accountName || null,
      accountNumber: parsed.data.accountNumber || null,
      momoNetwork: parsed.data.momoNetwork || null,
      momoNumber: parsed.data.momoNumber || null,
    },
    create: {
      userId: user.id,
      status: "PENDING",
      businessType: parsed.data.businessType,
      legalName: parsed.data.legalName,
      registrationNo: parsed.data.registrationNo || null,
      tin: parsed.data.tin || null,
      phone: parsed.data.phone,
      payoutType: parsed.data.payoutType,
      bankName: parsed.data.bankName || null,
      accountName: parsed.data.accountName || null,
      accountNumber: parsed.data.accountNumber || null,
      momoNetwork: parsed.data.momoNetwork ? parsed.data.momoNetwork : null,
      momoNumber: parsed.data.momoNumber || null,
      store: { create: { name: parsed.data.storeName, slug, description: parsed.data.description, city: parsed.data.city, region: parsed.data.region, active: false } },
      application: { create: { notes: parsed.data.notes || null, status: "PENDING" } },
    },
  });
  if (!seller) return { message: "The application could not be saved." };
  await prisma.sellerStore.upsert({
    where: { sellerId: seller.id },
    update: { name: parsed.data.storeName, description: parsed.data.description, city: parsed.data.city, region: parsed.data.region },
    create: { sellerId: seller.id, name: parsed.data.storeName, slug, description: parsed.data.description, city: parsed.data.city, region: parsed.data.region, active: false },
  });
  await prisma.sellerApplication.upsert({
    where: { sellerId: seller.id },
    update: { notes: parsed.data.notes || null, status: "PENDING" },
    create: { sellerId: seller.id, notes: parsed.data.notes || null, status: "PENDING" },
  });
  const file = formData.get("document");
  if (file instanceof File && file.size > 0) {
    const saved = await savePrivateFile(Buffer.from(await file.arrayBuffer()), file.name);
    if (saved.ok) {
      await prisma.sellerDocument.create({ data: { sellerId: seller.id, kind: "verification", filePath: saved.path, fileName: saved.fileName, mimeType: saved.mime, size: saved.size } });
    }
  }
  const admins = await prisma.user.findMany({ where: { roles: { has: "ADMIN" }, status: "ACTIVE" } });
  for (const admin of admins) await notifyUser(admin.id, { type: "SELLER", title: "New seller application", body: parsed.data.storeName, href: "/admin/sellers" });
  redirect("/seller/register?submitted=1");
}

async function approvedSeller() {
  const user = await sellerUser();
  if (!user.sellerProfile || user.sellerProfile.status !== "APPROVED") redirect("/seller/register");
  return { user, seller: user.sellerProfile };
}

async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  const root = slugify(base);
  if (!(await exists(root))) return root;
  for (let index = 2; index < 40; index += 1) {
    const candidate = `${root}-${index}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function saveProductAction(values: unknown) {
  const { user, seller } = await approvedSeller();
  const parsed = productSchema.safeParse(values);
  if (!parsed.success) return { ok: false as const, message: parsed.error.issues[0]?.message ?? "Check the product." };
  const site = await prisma.siteConfiguration.findUnique({ where: { id: "default" } });
  if (!site || parsed.data.currency !== site.currency) return { ok: false as const, message: "Use the marketplace currency." };
  const id = typeof values === "object" && values && "id" in values ? String(values.id ?? "") : "";
  const existing = id ? await prisma.product.findFirst({ where: { id, sellerId: seller.id } }) : null;
  const slug = existing?.slug ?? await uniqueSlug(parsed.data.name, async (value) => Boolean(await prisma.product.findUnique({ where: { slug: value } })));
  let brandId: string | null = null;
  if (parsed.data.brandName) {
    const brandSlug = slugify(parsed.data.brandName);
    const brand = await prisma.brand.upsert({ where: { slug: brandSlug }, update: { name: parsed.data.brandName }, create: { name: parsed.data.brandName, slug: brandSlug, description: `${parsed.data.brandName} on LZRE Books.` } });
    brandId = brand.id;
  }
  const prices = parsed.data.variants.map((variant) => cedisToPesewas(variant.price));
  const fromPrice = Math.min(...prices);
  const compareValues = parsed.data.variants.map((variant) => variant.compareAtPrice ? cedisToPesewas(variant.compareAtPrice) : null);
  const compareFrom = compareValues.find((value, index) => value && value > prices[index]!) ?? null;
  const status = existing?.status === "APPROVED" ? "PENDING_REVIEW" : "PENDING_REVIEW";
  const product = existing
    ? await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          categoryId: parsed.data.categoryId,
          brandId,
          condition: parsed.data.condition,
          currency: parsed.data.currency,
          weightGrams: parsed.data.weightGrams,
          lowStockThreshold: parsed.data.lowStockThreshold,
          metaTitle: parsed.data.metaTitle || null,
          metaDescription: parsed.data.metaDescription || null,
          fromPrice: pesewasToDecimal(fromPrice),
          compareFromPrice: compareFrom ? pesewasToDecimal(compareFrom) : null,
          status,
        },
      })
    : await prisma.product.create({
        data: {
          sellerId: seller.id,
          name: parsed.data.name,
          slug,
          description: parsed.data.description,
          categoryId: parsed.data.categoryId,
          brandId,
          condition: parsed.data.condition,
          currency: parsed.data.currency,
          weightGrams: parsed.data.weightGrams,
          lowStockThreshold: parsed.data.lowStockThreshold,
          metaTitle: parsed.data.metaTitle || null,
          metaDescription: parsed.data.metaDescription || null,
          fromPrice: pesewasToDecimal(fromPrice),
          compareFromPrice: compareFrom ? pesewasToDecimal(compareFrom) : null,
          status: "PENDING_REVIEW",
        },
      });
  await prisma.productAttribute.deleteMany({ where: { productId: product.id } });
  if (parsed.data.attributes.length) await prisma.productAttribute.createMany({ data: parsed.data.attributes.map((attribute) => ({ productId: product.id, name: attribute.name, value: attribute.value })) });
  const kept: string[] = [];
  for (const variant of parsed.data.variants) {
    const owner = await prisma.productVariant.findUnique({ where: { sku: variant.sku }, select: { productId: true } });
    if (owner && owner.productId !== product.id) return { ok: false as const, message: `SKU ${variant.sku} belongs to another product.` };
    const price = pesewasToDecimal(cedisToPesewas(variant.price));
    const compare = variant.compareAtPrice ? pesewasToDecimal(cedisToPesewas(variant.compareAtPrice)) : null;
    const saved = await prisma.productVariant.upsert({
      where: { sku: variant.sku },
      update: { name: variant.name, price, compareAtPrice: compare, options: variant.options, productId: product.id, active: true },
      create: { productId: product.id, sku: variant.sku, name: variant.name, price, compareAtPrice: compare, options: variant.options, isDefault: kept.length === 0 },
    });
    kept.push(saved.id);
    const inventory = await prisma.inventory.upsert({
      where: { variantId: saved.id },
      update: {},
      create: { variantId: saved.id, onHand: variant.stock, reserved: 0, available: variant.stock },
    });
    if (inventory.onHand !== variant.stock) {
      await prisma.$transaction(async (tx) => {
        const ok = await setOnHand(tx, saved.id, variant.stock, user.id);
        if (!ok) throw new Error("Stock cannot drop below reserved units.");
      });
    }
  }
  revalidatePath("/seller/products");
  return { ok: true as const, href: `/seller/products/${product.id}/edit` };
}

export async function uploadProductImageAction(formData: FormData) {
  const { seller } = await approvedSeller();
  const productId = String(formData.get("productId") ?? "");
  const product = await prisma.product.findFirst({ where: { id: productId, sellerId: seller.id } });
  if (!product) return;
  const file = formData.get("image");
  if (!(file instanceof File)) return;
  const saved = await savePublicImage(Buffer.from(await file.arrayBuffer()), String(formData.get("alt") || product.name));
  if (!saved.ok) return;
  const count = await prisma.productImage.count({ where: { productId } });
  await prisma.productImage.create({ data: { productId, url: saved.url, alt: saved.alt, sortOrder: count, isPrimary: count === 0 } });
  revalidatePath(`/seller/products/${productId}/edit`);
}

export async function archiveProductAction(formData: FormData) {
  const { seller } = await approvedSeller();
  await prisma.product.updateMany({ where: { id: String(formData.get("id") ?? ""), sellerId: seller.id }, data: { status: "ARCHIVED", deletedAt: new Date() } });
  revalidatePath("/seller/products");
}

export async function importProductsAction(formData: FormData) {
  const { seller } = await approvedSeller();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size > 512 * 1024) return;
  const parsed = parseProductCsv(await file.text());
  const site = await prisma.siteConfiguration.findUnique({ where: { id: "default" } });
  if (!site) return;
  for (const row of parsed.rows) {
    const category = await prisma.category.findUnique({ where: { slug: slugify(row.category) } });
    if (!category) continue;
    const slug = await uniqueSlug(row.name, async (value) => Boolean(await prisma.product.findUnique({ where: { slug: value } })));
    const taken = await prisma.productVariant.findUnique({ where: { sku: row.sku }, select: { id: true } });
    if (taken) continue;
    const price = pesewasToDecimal(cedisToPesewas(row.price));
    await prisma.product.create({
      data: {
        sellerId: seller.id,
        categoryId: category.id,
        name: row.name,
        slug,
        description: row.description,
        currency: site.currency,
        fromPrice: price,
        status: "DRAFT",
        variants: { create: { sku: row.sku, name: "Standard", price, isDefault: true, options: {}, inventory: { create: { onHand: row.stock, available: row.stock } } } },
      },
    });
  }
  revalidatePath("/seller/products");
}

export async function updateFulfillmentAction(formData: FormData) {
  const { user, seller } = await approvedSeller();
  const sellerOrder = await prisma.sellerOrder.findFirst({ where: { id: String(formData.get("id") ?? ""), sellerId: seller.id } });
  const next = String(formData.get("status") ?? "");
  if (!sellerOrder || !canTransitionFulfillment(sellerOrder.status, next as never)) return;
  if (next === "CANCELLED") {
    const [items, order] = await Promise.all([
      prisma.orderItem.findMany({ where: { sellerOrderId: sellerOrder.id } }),
      prisma.order.findUnique({ where: { id: sellerOrder.orderId }, include: { reservations: true } }),
    ]);
    const committed = order ? ["PAID", "COD_PENDING", "COD_COLLECTED", "SIMULATED", "PARTIALLY_REFUNDED"].includes(order.paymentStatus) : false;
    await prisma.$transaction(async (tx) => {
      await tx.sellerOrder.update({ where: { id: sellerOrder.id }, data: { status: "CANCELLED" } });
      for (const item of items) {
        if (committed) {
          await restoreCommittedStock(tx, item.variantId, item.quantity, user.id);
        } else {
          const reservation = order?.reservations.find((entry) => entry.variantId === item.variantId && !entry.committedAt && !entry.releasedAt);
          if (!reservation) continue;
          const released = await releaseStock(tx, item.variantId, item.quantity);
          if (released) await tx.stockReservation.update({ where: { id: reservation.id }, data: { releasedAt: new Date() } });
        }
      }
    });
  } else {
    await prisma.sellerOrder.update({ where: { id: sellerOrder.id }, data: { status: next as never } });
  }
  if (next === "SHIPPED" || next === "OUT_FOR_DELIVERY" || next === "DELIVERED") {
    await prisma.shipment.upsert({
      where: { sellerOrderId: sellerOrder.id },
      update: { status: next as never, carrier: String(formData.get("carrier") ?? "") || undefined, trackingNumber: String(formData.get("trackingNumber") ?? "") || undefined, shippedAt: next === "SHIPPED" ? new Date() : undefined, deliveredAt: next === "DELIVERED" ? new Date() : undefined },
      create: { sellerOrderId: sellerOrder.id, status: next as never, carrier: String(formData.get("carrier") ?? "") || null, trackingNumber: String(formData.get("trackingNumber") ?? "") || null, shippedAt: next === "SHIPPED" ? new Date() : null, deliveredAt: next === "DELIVERED" ? new Date() : null },
    });
  }
  if (next === "DELIVERED") {
    const pending = await prisma.sellerOrder.count({ where: { orderId: sellerOrder.orderId, status: { not: "DELIVERED" } } });
    if (pending === 0) await prisma.order.update({ where: { id: sellerOrder.orderId }, data: { status: "DELIVERED" } });
  }
  const order = await prisma.order.findUnique({ where: { id: sellerOrder.orderId } });
  if (order?.userId) await notifyUser(order.userId, { type: "SHIPMENT", title: `Order update ${sellerOrder.number}`, body: `Status: ${next}. This is not live courier tracking.`, href: `/account/orders/${order.id}` });
  await audit(user.id, "fulfillment.update", "SellerOrder", sellerOrder.id, { status: next });
  revalidatePath(`/seller/orders/${sellerOrder.id}`);
}

export async function sellerCollectCodAction(formData: FormData) {
  const { user, seller } = await approvedSeller();
  const sellerOrder = await prisma.sellerOrder.findFirst({ where: { id: String(formData.get("id") ?? ""), sellerId: seller.id }, include: { order: { include: { sellerOrders: true } } } });
  if (!sellerOrder) return;
  if (sellerOrder.order.sellerOrders.length > 1) return;
  await collectCod(sellerOrder.id, user.id);
  revalidatePath(`/seller/orders/${sellerOrder.id}`);
}

export async function updateStoreAction(formData: FormData) {
  const { seller } = await approvedSeller();
  await prisma.sellerStore.update({ where: { sellerId: seller.id }, data: { description: String(formData.get("description") ?? "").slice(0, 600), city: String(formData.get("city") ?? ""), region: String(formData.get("region") ?? "") } });
  revalidatePath("/seller/store");
}

export async function respondReturnAction(formData: FormData) {
  const { seller } = await approvedSeller();
  await prisma.returnRequest.updateMany({
    where: { id: String(formData.get("id") ?? ""), sellerId: seller.id },
    data: { sellerResponse: String(formData.get("response") ?? "").slice(0, 1000), status: "SELLER_REVIEW" },
  });
}
