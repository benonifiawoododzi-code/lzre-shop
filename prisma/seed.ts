import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import type { PrismaClient } from "@prisma/client";
import { loadEnv } from "../scripts/load-env";
import { ghanaRegions } from "../src/config/ghana";
import { brandDefaults } from "../src/config/site";

loadEnv();

const categories = [
  ["Phones and tablets", "phones-and-tablets", "Smartphone", "Handsets, tablets, and accessories sold by approved sellers."],
  ["Computers", "computers", "Laptop", "Laptops, desktops, and computer accessories."],
  ["Fashion", "fashion", "Shirt", "Clothing and shoes from independent sellers."],
  ["Watches and jewellery", "watches-and-jewellery", "Watch", "Watches and jewellery."],
  ["Beauty", "beauty", "Sparkles", "Skin, hair, and personal care."],
  ["Health", "health", "HeartPulse", "Everyday health and wellness goods."],
  ["Furniture", "furniture", "Sofa", "Furniture for home and office."],
  ["Kitchen", "kitchen", "Utensils", "Cookware and small kitchen appliances."],
  ["Tools", "tools", "Hammer", "Hand tools and workshop supplies."],
  ["Sports", "sports", "Dumbbell", "Sports and fitness equipment."],
  ["Toys", "toys", "Puzzle", "Toys and games."],
  ["Baby", "baby", "Baby", "Baby and toddler goods."],
  ["Books", "books", "BookOpen", "Books and stationery."],
  ["Automotive", "automotive", "Car", "Car accessories and parts."],
  ["Groceries", "groceries", "ShoppingBasket", "Packaged food and household staples."],
  ["Garden", "garden", "TreePine", "Garden and outdoor supplies."],
  ["Office", "office", "Printer", "Office supplies and equipment."],
  ["Gifts", "gifts", "Gift", "Gifts and seasonal goods."],
  ["Electronics parts", "electronics-parts", "Cpu", "Components and small electronics."],
  ["General", "general", "Tag", "Goods that do not fit another category."],
] as const;

const products = [
  { name: "Demonstration Android phone", slug: "demo-android-phone", category: "mobile-phones", price: "899.00", compare: "999.00", stock: 12, weight: 190, featured: true, sku: "DEMO-PHONE-128" },
  { name: "Demonstration laptop", slug: "demo-laptop", category: "computers", price: "3200.00", compare: null, stock: 4, weight: 1800, featured: true, sku: "DEMO-LAPTOP-14" },
  { name: "Demonstration cotton shirt", slug: "demo-cotton-shirt", category: "mens-clothing", price: "85.00", compare: "120.00", stock: 30, weight: 220, featured: false, sku: "DEMO-SHIRT-M" },
  { name: "Demonstration wristwatch", slug: "demo-wristwatch", category: "watches-and-jewellery", price: "240.00", compare: null, stock: 8, weight: 80, featured: false, sku: "DEMO-WATCH-01" },
  { name: "Demonstration shea balm", slug: "demo-shea-balm", category: "beauty", price: "35.00", compare: null, stock: 40, weight: 150, featured: false, sku: "DEMO-BALM-50" },
  { name: "Demonstration rice 5kg", slug: "demo-rice-5kg", category: "groceries", price: "78.00", compare: null, stock: 25, weight: 5000, featured: false, sku: "DEMO-RICE-5" },
  { name: "Demonstration office chair", slug: "demo-office-chair", category: "furniture", price: "650.00", compare: null, stock: 3, weight: 9000, featured: false, sku: "DEMO-CHAIR-01" },
  { name: "Demonstration blender", slug: "demo-blender", category: "kitchen", price: "210.00", compare: null, stock: 10, weight: 1600, featured: false, sku: "DEMO-BLEND-01" },
  { name: "Demonstration football", slug: "demo-football", category: "sports", price: "95.00", compare: null, stock: 16, weight: 430, featured: false, sku: "DEMO-BALL-05" },
  { name: "Demonstration notebook set", slug: "demo-notebook-set", category: "books", price: "28.00", compare: null, stock: 50, weight: 400, featured: false, sku: "DEMO-NOTE-3" },
  { name: "Demonstration garden hose", slug: "demo-garden-hose", category: "garden", price: "70.00", compare: null, stock: 9, weight: 1200, featured: false, sku: "DEMO-HOSE-15" },
  { name: "Demonstration car phone mount", slug: "demo-car-phone-mount", category: "automotive", price: "45.00", compare: null, stock: 20, weight: 180, featured: false, sku: "DEMO-MOUNT-01" },
];

function demoPassword() {
  const configured = process.env.SEED_DEMO_PASSWORD ?? "";
  if (!configured) return { password: `Lzre-${randomBytes(9).toString("base64url")}`, generated: true };
  if (configured.length < 12 || !/[A-Za-z]/.test(configured) || !/\d/.test(configured)) {
    throw new Error("SEED_DEMO_PASSWORD must be at least 12 characters and include a letter and a number.");
  }
  return { password: configured, generated: false };
}

async function seed(prisma: PrismaClient) {
  await prisma.siteConfiguration.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      marketplaceName: brandDefaults.name,
      tagline: brandDefaults.tagline,
      currency: brandDefaults.currency,
      country: brandDefaults.country,
      mode: "MULTI_VENDOR",
      commissionRate: "10.00",
      supportEmail: brandDefaults.supportEmail,
      phone: brandDefaults.phone,
      address: brandDefaults.address,
      announcement: "Demonstration catalog. Payments without Paystack keys stay simulated.",
      announcementActive: true,
      heroTitle: "Everyday goods from sellers across Ghana.",
      heroSubtitle: "One cart. Each seller fulfills their own items. Cash on delivery where the zone allows it.",
      heroPrimaryLabel: "Browse products",
      heroPrimaryHref: "/products",
      heroSecondaryLabel: "Sell on LZRE",
      heroSecondaryHref: "/seller/register",
      heroBadge: "Ghana",
      socialLinks: {},
    },
  });

  for (const [index, [name, slug, icon, description]] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug },
      update: { name, icon, description, sortOrder: index, visible: true },
      create: { name, slug, icon, description, sortOrder: index },
    });
  }
  const phones = await prisma.category.findUniqueOrThrow({ where: { slug: "phones-and-tablets" } });
  const fashion = await prisma.category.findUniqueOrThrow({ where: { slug: "fashion" } });
  await prisma.category.upsert({
    where: { slug: "mobile-phones" },
    update: { parentId: phones.id },
    create: { name: "Mobile phones", slug: "mobile-phones", description: "Mobile phones listed by approved sellers.", icon: "Smartphone", parentId: phones.id, sortOrder: 0 },
  });
  await prisma.category.upsert({
    where: { slug: "mens-clothing" },
    update: { parentId: fashion.id },
    create: { name: "Men's clothing", slug: "mens-clothing", description: "Men's clothing listed by approved sellers.", icon: "Shirt", parentId: fashion.id, sortOrder: 0 },
  });

  const brand = await prisma.brand.upsert({
    where: { slug: "lzre-basics" },
    update: { featured: true, visible: true },
    create: { name: "LZRE Basics", slug: "lzre-basics", description: "Demonstration brand used by the sample catalog.", featured: true },
  });
  await prisma.brand.upsert({
    where: { slug: "northstar" },
    update: {},
    create: { name: "Northstar", slug: "northstar", description: "Second demonstration brand.", featured: false },
  });

  for (const component of [
    { code: "NHIL", name: "NHIL (demonstration)", ratePercent: "2.500", sequence: 1, applyOn: "NET" as const },
    { code: "GETFUND", name: "GETFund (demonstration)", ratePercent: "2.500", sequence: 2, applyOn: "NET" as const },
    { code: "VAT", name: "VAT (demonstration)", ratePercent: "15.000", sequence: 3, applyOn: "RUNNING" as const },
  ]) {
    await prisma.taxComponent.upsert({
      where: { code: component.code },
      update: { demonstration: true, active: true },
      create: { ...component, demonstration: true, country: brandDefaults.country },
    });
  }

  const standard = await prisma.shippingMethod.upsert({
    where: { code: "standard" },
    update: {},
    create: { code: "standard", name: "Standard delivery", description: "Demonstration delivery estimate of 2 to 5 days. Not a live courier.", estimatedMinDays: 2, estimatedMaxDays: 5 },
  });
  const express = await prisma.shippingMethod.upsert({
    where: { code: "express" },
    update: {},
    create: { code: "express", name: "Express delivery", description: "Demonstration delivery estimate of 1 to 2 days. Not a live courier.", estimatedMinDays: 1, estimatedMaxDays: 2 },
  });

  const rest = ghanaRegions.filter((region) => region !== "Greater Accra" && region !== "Ashanti");
  const zones = [
    { name: "Greater Accra", regions: ["Greater Accra"], codAllowed: true, standard: "20.00", express: "35.00", note: "Demonstration rate. Cash on delivery is allowed in this sample zone." },
    { name: "Ashanti", regions: ["Ashanti"], codAllowed: true, standard: "35.00", express: "55.00", note: "Demonstration rate. Cash on delivery is allowed in this sample zone." },
    { name: "Rest of Ghana", regions: [...rest], codAllowed: false, standard: "45.00", express: "70.00", note: "Demonstration rate. Cash on delivery is not offered in this sample zone." },
  ];
  for (const zone of zones) {
    const saved = await prisma.shippingZone.upsert({
      where: { id: `seed-${zone.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: { regions: zone.regions, codAllowed: zone.codAllowed, note: zone.note, active: true },
      create: { id: `seed-${zone.name.toLowerCase().replace(/\s+/g, "-")}`, name: zone.name, country: brandDefaults.country, regions: zone.regions, codAllowed: zone.codAllowed, note: zone.note },
    });
    for (const method of [
      { id: standard.id, price: zone.standard },
      { id: express.id, price: zone.express },
    ]) {
      await prisma.shippingRate.upsert({
        where: { zoneId_methodId: { zoneId: saved.id, methodId: method.id } },
        update: { price: method.price, currency: brandDefaults.currency },
        create: { zoneId: saved.id, methodId: method.id, price: method.price, currency: brandDefaults.currency, freeThreshold: "500.00", includedWeightGrams: 5000, extraPerKg: "5.00" },
      });
    }
  }

  const pages = [
    ["about", "About LZRE", "What LZRE is.", "LZRE is a multi-seller marketplace. Customers pay once. Each seller fulfills their own items.\n\n## Demonstration data\n\nSample products, shipping rates, and tax components are labeled as demonstration data. They are not offers or legal advice."],
    ["shipping", "Shipping", "How delivery works.", "Delivery estimates come from the shipping method you choose at checkout.\n\n## Tracking\n\nA seller can store a carrier name and a tracking number. LZRE does not contact the courier and does not show live location.\n\nSeeded prices are demonstration rates."],
    ["returns", "Returns", "How returns work.", "A return can be requested after an order is marked delivered, inside the return window set by an administrator.\n\n## Refunds\n\nAn online refund is recorded only when the payment provider confirms it. An administrator can record an offline refund after the money has actually been returned."],
    ["privacy", "Privacy", "How LZRE handles personal information.", "LZRE stores the account, order, and seller information needed to run the marketplace.\n\n## Your requests\n\nUse the privacy request form to ask for access or deletion. Marketing email is sent only after you consent.\n\nThis page describes the product's controls. It is not a certification under the Ghana Data Protection Act."],
    ["terms", "Terms", "Marketplace terms.", "By placing an order you buy from the marketplace, which then splits the order among the sellers whose items you chose.\n\n## Payments\n\nCard and mobile money payments are marked paid only after a verified Paystack webhook. Cash on delivery stays unpaid until collection is recorded. A sandbox checkout is labeled simulated and is not a payment."],
    ["selling", "Selling on LZRE", "How selling works.", "Create a customer account, then submit a seller application. Products stay off the storefront until an administrator approves them.\n\n## Commission\n\nCommission is calculated on the server from the administrator's rate. Sellers cannot change it. Payouts stay pending until a Paystack subaccount exists or an administrator records a manual payout."],
  ] as const;
  for (const [slug, title, description, body] of pages) {
    await prisma.cmsPage.upsert({
      where: { slug },
      update: { title, description, body, published: true },
      create: { slug, title, description, body },
    });
  }

  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: { active: true },
    create: { code: "WELCOME10", description: "Demonstration coupon: 10 percent off merchandise.", type: "PERCENTAGE", value: "10.00", active: true },
  });

  const live = await prisma.promotion.findFirst({ where: { title: "Shop the demonstration catalog" } });
  if (!live) {
    await prisma.promotion.create({
      data: { placement: "HERO", title: "Shop the demonstration catalog", subtitle: "Sample products from the LZRE demonstration store.", ctaLabel: "View products", ctaHref: "/products", active: true },
    });
  }
  const expired = await prisma.promotion.findFirst({ where: { title: "Expired sample promotion" } });
  if (!expired) {
    await prisma.promotion.create({
      data: { placement: "BANNER", title: "Expired sample promotion", subtitle: "This promotion is in the past and should not appear on the storefront.", active: true, endsAt: new Date("2020-01-01T00:00:00.000Z") },
    });
  }

  const { password, generated } = demoPassword();
  const { hashPassword } = await import("../src/lib/password");
  const passwordHash = await hashPassword(password);
  const created: string[] = [];

  async function ensureUser(email: string, name: string, roles: Array<"CUSTOMER" | "SELLER" | "ADMIN">) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return existing;
    created.push(email);
    return prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        roles,
        emailVerified: new Date(),
        customerProfile: { create: {} },
        notificationPreference: { create: {} },
      },
    });
  }

  const sellerUser = await ensureUser("seller@lzre.test", "LZRE demonstration seller", ["CUSTOMER", "SELLER"]);
  const customer = await ensureUser("customer@lzre.test", "LZRE demonstration customer", ["CUSTOMER"]);

  const seller = await prisma.sellerProfile.upsert({
    where: { userId: sellerUser.id },
    update: { status: "APPROVED" },
    create: {
      userId: sellerUser.id,
      status: "APPROVED",
      businessType: "REGISTERED_BUSINESS",
      legalName: "LZRE Demonstration Trading",
      phone: "+233244000001",
      payoutType: "MOBILE_MONEY",
      momoNetwork: "MTN",
      momoNumber: "+233244000001",
      approvedAt: new Date(),
      application: { create: { status: "APPROVED", notes: "Seeded demonstration seller." } },
    },
  });
  await prisma.sellerStore.upsert({
    where: { sellerId: seller.id },
    update: { active: true },
    create: {
      sellerId: seller.id,
      name: "LZRE platform store",
      slug: "lzre-platform-store",
      description: "Demonstration store. The products here are sample catalog data, not live inventory from an independent seller.",
      city: "Accra",
      region: "Greater Accra",
      active: true,
    },
  });

  const hasAddress = await prisma.address.findFirst({ where: { userId: customer.id } });
  if (!hasAddress) {
    await prisma.address.create({
      data: {
        userId: customer.id,
        fullName: "LZRE demonstration customer",
        phone: "+233201000001",
        line1: "14 Independence Avenue",
        city: "Accra",
        region: "Greater Accra",
        country: brandDefaults.country,
        isDefault: true,
      },
    });
  }

  for (const item of products) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: item.category } });
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: { status: "APPROVED", fromPrice: item.price, compareFromPrice: item.compare },
      create: {
        sellerId: seller.id,
        categoryId: category.id,
        brandId: brand.id,
        name: item.name,
        slug: item.slug,
        description: "Demonstration product. This is sample catalog data for the LZRE marketplace. It is not a live offer.",
        condition: "NEW",
        status: "APPROVED",
        currency: brandDefaults.currency,
        fromPrice: item.price,
        compareFromPrice: item.compare,
        weightGrams: item.weight,
        isFeatured: item.featured,
        publishedAt: new Date(),
        metaTitle: item.name,
        metaDescription: "Demonstration product in the LZRE sample catalog.",
      },
    });
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({ data: { productId: product.id, url: `/demo-image/${item.slug}`, alt: item.name, isPrimary: true } });
    await prisma.productAttribute.deleteMany({ where: { productId: product.id } });
    await prisma.productAttribute.create({ data: { productId: product.id, name: "Label", value: "Demonstration" } });
    const variant = await prisma.productVariant.upsert({
      where: { sku: item.sku },
      update: { price: item.price, compareAtPrice: item.compare, productId: product.id },
      create: { productId: product.id, sku: item.sku, name: "Standard", price: item.price, compareAtPrice: item.compare, options: {}, isDefault: true },
    });
    const inventory = await prisma.inventory.upsert({
      where: { variantId: variant.id },
      update: {},
      create: { variantId: variant.id, onHand: item.stock, reserved: 0, available: item.stock },
    });
    const movement = await prisma.inventoryMovement.findFirst({ where: { inventoryId: inventory.id, reason: "RECEIVE" } });
    if (!movement) await prisma.inventoryMovement.create({ data: { inventoryId: inventory.id, quantity: item.stock, reason: "RECEIVE", note: "Seeded demonstration stock." } });
  }

  if (generated && created.length) {
    mkdirSync(".data", { recursive: true });
    writeFileSync(".data/demo-passwords.txt", `Demonstration accounts created by the seed. This file is gitignored.\n${created.map((email) => `${email} ${password}`).join("\n")}\n`, { flag: "a" });
    console.log("Wrote new demonstration passwords to .data/demo-passwords.txt");
  }
  console.log("Seed complete. No reviews and no shipment tracking were created.");
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    await seed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Seed failed.");
  process.exit(1);
});
