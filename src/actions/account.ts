"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/notify";
import { addressSchema, profileSchema, questionSchema, returnSchema, reviewSchema } from "@/lib/validation/schemas";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function createReviewAction(formData: FormData) {
  const user = await requireUser();
  const parsed = reviewSchema.safeParse({
    orderItemId: formData.get("orderItemId"),
    rating: formData.get("rating"),
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) return;
  const item = await prisma.orderItem.findFirst({
    where: {
      id: parsed.data.orderItemId,
      order: { userId: user.id, OR: [{ paymentStatus: { in: ["PAID", "COD_COLLECTED"] } }, { status: "DELIVERED" }] },
      review: { is: null },
    },
    include: { product: true },
  });
  if (!item) return;
  await prisma.review.create({
    data: {
      productId: item.productId,
      userId: user.id,
      orderItemId: item.id,
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.body,
      verified: true,
      status: "PUBLISHED",
    },
  });
  const stats = await prisma.review.aggregate({ where: { productId: item.productId, status: "PUBLISHED" }, _avg: { rating: true }, _count: true });
  await prisma.product.update({ where: { id: item.productId }, data: { ratingAverage: stats._avg.rating ?? 0, ratingCount: stats._count } });
  const sellerStats = await prisma.review.aggregate({ where: { product: { sellerId: item.sellerId }, status: "PUBLISHED" }, _avg: { rating: true }, _count: true });
  await prisma.sellerStore.updateMany({ where: { sellerId: item.sellerId }, data: { ratingAverage: sellerStats._avg.rating ?? 0, ratingCount: sellerStats._count } });
  revalidatePath(`/products/${item.product.slug}`);
}

export async function askQuestionAction(formData: FormData) {
  const user = await requireUser();
  const parsed = questionSchema.safeParse({ productId: formData.get("productId"), body: formData.get("body") });
  if (!parsed.success) return;
  const product = await prisma.product.findFirst({ where: { id: parsed.data.productId, status: "APPROVED" }, include: { seller: true } });
  if (!product) return;
  await prisma.productQuestion.create({ data: { productId: product.id, userId: user.id, body: parsed.data.body, status: "PENDING" } });
  await notifyUser(product.seller.userId, { type: "PRODUCT", title: "New product question", body: product.name, href: "/seller/products" });
}

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    marketingConsent: formData.get("marketingConsent") === "true",
    orderEmail: formData.get("orderEmail") === "true",
  });
  if (!parsed.success) return;
  await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.name, phone: parsed.data.phone, marketingConsent: parsed.data.marketingConsent } });
  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    update: { marketingEmail: parsed.data.marketingConsent, orderEmail: parsed.data.orderEmail },
    create: { userId: user.id, marketingEmail: parsed.data.marketingConsent, orderEmail: parsed.data.orderEmail },
  });
  revalidatePath("/account/profile");
}

export async function saveAddressAction(formData: FormData) {
  const user = await requireUser();
  const parsed = addressSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    line1: formData.get("line1"),
    line2: formData.get("line2") ?? "",
    city: formData.get("city"),
    region: formData.get("region"),
    ghanaPostGps: formData.get("ghanaPostGps") ?? "",
    postalCode: formData.get("postalCode") ?? "",
    instructions: formData.get("instructions") ?? "",
    isDefault: formData.get("isDefault") === "true",
  });
  if (!parsed.success) return;
  if (parsed.data.isDefault) await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
  const id = String(formData.get("id") ?? "");
  const data = {
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    line1: parsed.data.line1,
    line2: parsed.data.line2 || null,
    city: parsed.data.city,
    region: parsed.data.region,
    ghanaPostGps: parsed.data.ghanaPostGps || null,
    postalCode: parsed.data.postalCode || null,
    instructions: parsed.data.instructions || null,
    isDefault: parsed.data.isDefault,
    country: "GH",
  };
  if (id) {
    await prisma.address.updateMany({ where: { id, userId: user.id }, data });
  } else {
    await prisma.address.create({ data: { ...data, userId: user.id } });
  }
  revalidatePath("/account/addresses");
}

export async function deleteAddressAction(formData: FormData) {
  const user = await requireUser();
  await prisma.address.deleteMany({ where: { id: String(formData.get("id") ?? ""), userId: user.id } });
  revalidatePath("/account/addresses");
}

export async function requestReturnAction(formData: FormData) {
  const user = await requireUser();
  const parsed = returnSchema.safeParse({
    orderItemId: formData.get("orderItemId"),
    reason: formData.get("reason"),
    description: formData.get("description"),
  });
  if (!parsed.success) return;
  const item = await prisma.orderItem.findFirst({ where: { id: parsed.data.orderItemId, order: { userId: user.id, status: "DELIVERED" } }, include: { order: true } });
  if (!item) return;
  const site = await prisma.siteConfiguration.findUnique({ where: { id: "default" } });
  const windowDays = site?.returnWindowDays ?? 7;
  const age = Date.now() - item.order.updatedAt.getTime();
  if (age > windowDays * 24 * 60 * 60 * 1000) return;
  await prisma.returnRequest.create({
    data: { orderId: item.orderId, orderItemId: item.id, userId: user.id, sellerId: item.sellerId, reason: parsed.data.reason, description: parsed.data.description },
  });
  redirect("/account/orders");
}

export async function requestCancellationAction(formData: FormData) {
  const user = await requireUser();
  const sellerOrderId = String(formData.get("sellerOrderId") ?? "");
  const reason = String(formData.get("reason") ?? "").slice(0, 300);
  const sellerOrder = await prisma.sellerOrder.findFirst({
    where: { id: sellerOrderId, order: { userId: user.id }, status: { in: ["PENDING", "CONFIRMED", "PACKED"] } },
  });
  if (!sellerOrder) return;
  await prisma.sellerOrder.update({ where: { id: sellerOrder.id }, data: { cancellationRequested: true, cancellationReason: reason } });
  revalidatePath("/account/orders");
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/account/notifications");
}
