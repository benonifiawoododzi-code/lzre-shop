"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { audit, notifyUser } from "@/lib/notify";
import { payoutLedger, refundLedger } from "@/lib/pricing/ledger";
import { cedisToPesewas, pesewasToDecimal } from "@/lib/pricing/money";
import { canSetCommission, canModerateCatalog } from "@/lib/permissions";
import { slugify } from "@/lib/utils";

async function adminUser() {
  const user = await getCurrentUser();
  if (!user || !canModerateCatalog({ id: user.id, roles: user.roles, status: user.status, sellerId: user.sellerProfile?.id })) redirect("/");
  return user;
}

export async function approveProductAction(formData: FormData) {
  const admin = await adminUser();
  const id = String(formData.get("id") ?? "");
  const product = await prisma.product.update({ where: { id }, data: { status: "APPROVED", publishedAt: new Date(), rejectionReason: null }, include: { seller: true } });
  await notifyUser(product.seller.userId, { type: "PRODUCT", title: "Product approved", body: product.name, href: "/seller/products" });
  await audit(admin.id, "product.approve", "Product", id);
  revalidatePath("/admin/products");
}

export async function rejectProductAction(formData: FormData) {
  const admin = await adminUser();
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "Does not meet the catalog standard.");
  const product = await prisma.product.update({ where: { id }, data: { status: "REJECTED", rejectionReason: reason }, include: { seller: true } });
  await notifyUser(product.seller.userId, { type: "PRODUCT", title: "Product rejected", body: reason, href: "/seller/products" });
  await audit(admin.id, "product.reject", "Product", id);
}

export async function featureProductAction(formData: FormData) {
  await adminUser();
  const id = String(formData.get("id") ?? "");
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return;
  await prisma.product.update({ where: { id }, data: { isFeatured: !product.isFeatured } });
}

export async function saveCategoryAction(formData: FormData) {
  const admin = await adminUser();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "") || null;
  if (name.length < 2 || description.length < 10) return;
  const slugInput = String(formData.get("slug") ?? "");
  const slug = slugify(slugInput || name);
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.category.update({ where: { id }, data: { name, description, parentId, slug } });
  else await prisma.category.create({ data: { name, description, parentId, slug, icon: "Tag" } });
  await audit(admin.id, "category.save", "Category", id || slug);
  revalidatePath("/admin/categories");
}

export async function deleteCategoryAction(formData: FormData) {
  const admin = await adminUser();
  const id = String(formData.get("id") ?? "");
  const [products, children] = await Promise.all([prisma.product.count({ where: { categoryId: id } }), prisma.category.count({ where: { parentId: id } })]);
  if (products > 0 || children > 0) return;
  await prisma.category.delete({ where: { id } });
  await audit(admin.id, "category.delete", "Category", id);
}

export async function saveBrandAction(formData: FormData) {
  await adminUser();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return;
  const slug = slugify(String(formData.get("slug") ?? name));
  await prisma.brand.upsert({ where: { slug }, update: { name, featured: formData.get("featured") === "true" }, create: { name, slug, featured: formData.get("featured") === "true" } });
  revalidatePath("/admin/brands");
}

export async function decideSellerAction(formData: FormData) {
  const admin = await adminUser();
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const seller = await prisma.sellerProfile.findUnique({ where: { id }, include: { user: true, store: true } });
  if (!seller) return;
  if (decision === "approve") {
    await prisma.sellerProfile.update({ where: { id }, data: { status: "APPROVED", approvedAt: new Date() } });
    await prisma.sellerStore.update({ where: { sellerId: id }, data: { active: true } });
    await prisma.sellerApplication.update({ where: { sellerId: id }, data: { status: "APPROVED", reviewedBy: admin.id, reviewedAt: new Date() } });
    const roles = seller.user.roles.includes("SELLER") ? seller.user.roles : [...seller.user.roles, "SELLER" as const];
    await prisma.user.update({ where: { id: seller.userId }, data: { roles } });
    await notifyUser(seller.userId, { type: "SELLER", title: "Seller application approved", body: seller.store?.name ?? seller.legalName, href: "/seller/dashboard" });
  }
  if (decision === "reject" || decision === "suspend") {
    const status = decision === "reject" ? "REJECTED" : "SUSPENDED";
    await prisma.sellerProfile.update({ where: { id }, data: { status, rejectionReason: String(formData.get("reason") ?? "") } });
    if (seller.store) await prisma.sellerStore.update({ where: { sellerId: id }, data: { active: false } });
    await notifyUser(seller.userId, { type: "SELLER", title: `Seller application ${status.toLowerCase()}`, body: String(formData.get("reason") ?? ""), href: "/seller/register" });
  }
  if (decision === "reinstate") {
    await prisma.sellerProfile.update({ where: { id }, data: { status: "APPROVED" } });
    if (seller.store) await prisma.sellerStore.update({ where: { sellerId: id }, data: { active: true } });
  }
  await audit(admin.id, `seller.${decision}`, "SellerProfile", id);
  revalidatePath("/admin/sellers");
}

export async function setCommissionAction(formData: FormData) {
  const admin = await adminUser();
  const actor = { id: admin.id, roles: admin.roles, status: admin.status, sellerId: admin.sellerProfile?.id };
  if (!canSetCommission(actor)) return;
  const rate = Number(formData.get("rate"));
  if (!Number.isFinite(rate) || rate < 0 || rate > 50) return;
  await prisma.sellerProfile.update({ where: { id: String(formData.get("id") ?? "") }, data: { commissionRate: rate } });
  await audit(admin.id, "seller.commission", "SellerProfile", String(formData.get("id")), { rate });
}

export async function setCustomerStatusAction(formData: FormData) {
  const admin = await adminUser();
  const id = String(formData.get("id") ?? "");
  if (id === admin.id) return;
  const status = formData.get("status") === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
  await prisma.user.update({ where: { id }, data: { status } });
  await audit(admin.id, "customer.status", "User", id, { status });
}

export async function recordPayoutAction(formData: FormData) {
  const admin = await adminUser();
  const sellerId = String(formData.get("sellerId") ?? "");
  const amount = cedisToPesewas(String(formData.get("amount") ?? "0"));
  if (amount <= 0) return;
  const entries = await prisma.ledgerEntry.findMany({ where: { sellerId, account: "SELLER_PAYABLE" } });
  const balance = entries.reduce((sum, entry) => sum + (entry.direction === "CREDIT" ? 1 : -1) * cedisToPesewas(entry.amount.toString()), 0);
  if (amount > balance) return;
  const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) return;
  const site = await prisma.siteConfiguration.findUnique({ where: { id: "default" } });
  await prisma.$transaction(async (tx) => {
    const payout = await tx.payout.create({ data: { sellerId, amount: pesewasToDecimal(amount), currency: site?.currency ?? "GHS", status: "PAID", note: "Manual payout recorded by an administrator.", paidAt: new Date(), createdBy: admin.id } });
    for (const line of payoutLedger(amount, sellerId)) {
      await tx.ledgerEntry.create({ data: { sellerId: line.sellerId, payoutId: payout.id, account: line.account, direction: line.direction, amount: pesewasToDecimal(line.amount), currency: site?.currency ?? "GHS", memo: line.memo } });
    }
  });
  await audit(admin.id, "payout.record", "SellerProfile", sellerId, { amount });
}

export async function saveCouponAction(formData: FormData) {
  await adminUser();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const type = String(formData.get("type") ?? "PERCENTAGE");
  if (!code || !["PERCENTAGE", "FIXED", "FREE_SHIPPING"].includes(type)) return;
  await prisma.coupon.upsert({
    where: { code },
    update: { description: String(formData.get("description") ?? code), type: type as "PERCENTAGE", value: String(formData.get("value") ?? "10"), active: true },
    create: { code, description: String(formData.get("description") ?? code), type: type as "PERCENTAGE", value: String(formData.get("value") ?? "10"), active: true },
  });
  revalidatePath("/admin/promotions");
}

export async function savePromotionAction(formData: FormData) {
  await adminUser();
  const href = String(formData.get("ctaHref") ?? "");
  if (href && (!href.startsWith("/") || href.startsWith("//"))) return;
  await prisma.promotion.create({
    data: {
      placement: (String(formData.get("placement") ?? "BANNER") as "BANNER"),
      title: String(formData.get("title") ?? ""),
      subtitle: String(formData.get("subtitle") ?? ""),
      ctaLabel: String(formData.get("ctaLabel") ?? ""),
      ctaHref: href || null,
      startsAt: formData.get("startsAt") ? new Date(String(formData.get("startsAt"))) : null,
      endsAt: formData.get("endsAt") ? new Date(String(formData.get("endsAt"))) : null,
      active: true,
    },
  });
  revalidatePath("/");
}

export async function saveSiteAction(formData: FormData) {
  const admin = await adminUser();
  await prisma.siteConfiguration.update({
    where: { id: "default" },
    data: {
      marketplaceName: String(formData.get("marketplaceName") ?? ""),
      tagline: String(formData.get("tagline") ?? ""),
      currency: String(formData.get("currency") ?? "").toUpperCase(),
      country: String(formData.get("country") ?? "").toUpperCase(),
      commissionRate: String(formData.get("commissionRate") ?? "10"),
      supportEmail: String(formData.get("supportEmail") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      address: String(formData.get("address") ?? ""),
      announcement: String(formData.get("announcement") ?? ""),
      announcementActive: formData.get("announcementActive") === "true",
      mode: formData.get("mode") === "SINGLE_MERCHANT" ? "SINGLE_MERCHANT" : "MULTI_VENDOR",
    },
  });
  await audit(admin.id, "settings.update", "SiteConfiguration", "default");
  revalidatePath("/");
}

export async function moderateReviewAction(formData: FormData) {
  const admin = await adminUser();
  const status = formData.get("status") === "HIDDEN" ? "HIDDEN" : "PUBLISHED";
  await prisma.review.update({ where: { id: String(formData.get("id") ?? "") }, data: { status } });
  await audit(admin.id, "review.moderate", "Review", String(formData.get("id")), { status });
}

export async function answerQuestionAction(formData: FormData) {
  const admin = await adminUser();
  await prisma.productQuestion.update({
    where: { id: String(formData.get("id") ?? "") },
    data: { answer: String(formData.get("answer") ?? ""), status: "PUBLISHED", answeredBy: admin.id, answeredAt: new Date() },
  });
}

export async function recordOfflineRefundAction(formData: FormData) {
  const admin = await adminUser();
  if (formData.get("confirm") !== "yes") return;
  const order = await prisma.order.findUnique({ where: { id: String(formData.get("orderId") ?? "") }, include: { payments: true, sellerOrders: true } });
  if (!order) return;
  const amount = cedisToPesewas(String(formData.get("amount") ?? "0"));
  const commission = cedisToPesewas(String(formData.get("commission") ?? "0"));
  const seller = amount - commission;
  const lines = refundLedger({ amount, commissionReversal: commission, sellerClawback: seller });
  if (!lines.ok) return;
  await prisma.$transaction(async (tx) => {
    await tx.refund.create({ data: { orderId: order.id, paymentId: order.payments[0]?.id, amount: pesewasToDecimal(amount), currency: order.currency, status: "COMPLETED", reason: String(formData.get("reason") ?? "Offline refund"), offline: true, createdBy: admin.id } });
    for (const line of lines.lines) {
      await tx.ledgerEntry.create({ data: { orderId: order.id, account: line.account, direction: line.direction, amount: pesewasToDecimal(line.amount), currency: order.currency, memo: line.memo } });
    }
    await tx.order.update({ where: { id: order.id }, data: { paymentStatus: amount === cedisToPesewas(order.grandTotal.toString()) ? "REFUNDED" : "PARTIALLY_REFUNDED", status: amount === cedisToPesewas(order.grandTotal.toString()) ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
  });
  await audit(admin.id, "refund.offline", "Order", order.id, { amount });
}

export async function decideReturnAction(formData: FormData) {
  const admin = await adminUser();
  const status = String(formData.get("status") ?? "");
  if (!["APPROVED", "REJECTED", "RECEIVED", "CLOSED"].includes(status)) return;
  await prisma.returnRequest.update({ where: { id: String(formData.get("id") ?? "") }, data: { status: status as "APPROVED", adminResponse: String(formData.get("response") ?? "") } });
  await audit(admin.id, "return.decide", "ReturnRequest", String(formData.get("id")), { status });
}
