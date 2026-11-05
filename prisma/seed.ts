import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import type { PrismaClient } from "@prisma/client";
import { loadEnv } from "../scripts/load-env";
import { ghanaRegions } from "../src/config/ghana";
import { brandDefaults } from "../src/config/site";

loadEnv();

const categories = [
  ["Fiction", "fiction", "BookOpen", "Novels and short stories."],
  ["Nonfiction", "nonfiction", "Library", "History, essays, and reported stories."],
  ["Children's books", "childrens-books", "Baby", "Picture books and early readers."],
  ["School books", "school-books", "GraduationCap", "Practice books for school subjects."],
  ["Poetry", "poetry", "Feather", "Poems and collected letters."],
] as const;

const products = [
  { name: "Night Market", slug: "book-night-market", category: "fiction", price: "70.00", compare: null, stock: 18, weight: 340, featured: true, sku: "BOOK-NIGHT-01", blurb: "A sample novel about one night in an Accra market. Demonstration title, not a published book." },
  { name: "Accra After Rain", slug: "book-accra-after-rain", category: "fiction", price: "65.00", compare: "80.00", stock: 14, weight: 310, featured: true, sku: "BOOK-ACCRA-01", blurb: "A sample novel set after a storm in Accra. Demonstration title, not a published book." },
  { name: "Market Days in Kumasi", slug: "book-market-days", category: "fiction", price: "58.00", compare: null, stock: 16, weight: 300, featured: false, sku: "BOOK-KUMASI-01", blurb: "A sample story about market days in Kumasi. Demonstration title, not a published book." },
  { name: "Cocoa and the Coast", slug: "book-cocoa-coast", category: "nonfiction", price: "85.00", compare: null, stock: 12, weight: 420, featured: true, sku: "BOOK-COCOA-01", blurb: "A sample nonfiction book about cocoa and the coast. Demonstration title, not a published book." },
  { name: "A Short History of Gold", slug: "book-history-of-gold", category: "nonfiction", price: "90.00", compare: "110.00", stock: 9, weight: 460, featured: true, sku: "BOOK-GOLD-01", blurb: "A sample history of gold. Demonstration title, not a published book." },
  { name: "Ananse and the River", slug: "book-ananse-river", category: "childrens-books", price: "42.00", compare: null, stock: 24, weight: 220, featured: false, sku: "BOOK-ANANSE-01", blurb: "A sample children's story. Demonstration title, not a published book." },
  { name: "Bedtime in the Baobab", slug: "book-baobab-bedtime", category: "childrens-books", price: "38.00", compare: null, stock: 22, weight: 200, featured: false, sku: "BOOK-BAOBAB-01", blurb: "A sample bedtime picture book. Demonstration title, not a published book." },
  { name: "Numbers for Primary Four", slug: "book-primary-numbers", category: "school-books", price: "35.00", compare: "45.00", stock: 40, weight: 280, featured: false, sku: "BOOK-NUM-P4", blurb: "A sample primary mathematics practice book. Demonstration title, not a published textbook." },
  { name: "First Science Workbook", slug: "book-first-science", category: "school-books", price: "40.00", compare: null, stock: 30, weight: 300, featured: false, sku: "BOOK-SCI-01", blurb: "A sample first science workbook. Demonstration title, not a published textbook." },
  { name: "English Grammar Practice", slug: "book-english-grammar", category: "school-books", price: "32.00", compare: null, stock: 36, weight: 260, featured: false, sku: "BOOK-ENG-01", blurb: "A sample English grammar practice book. Demonstration title, not a published textbook." },
  { name: "Poems from the Volta", slug: "book-volta-poems", category: "poetry", price: "48.00", compare: null, stock: 15, weight: 180, featured: false, sku: "BOOK-VOLTA-01", blurb: "A sample poetry collection. Demonstration title, not a published book." },
  { name: "Letters Home", slug: "book-letters-home", category: "poetry", price: "44.00", compare: "55.00", stock: 13, weight: 190, featured: false, sku: "BOOK-LETTERS-01", blurb: "A sample collection of letters. Demonstration title, not a published book." },
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
    update: {
      marketplaceName: brandDefaults.name,
      tagline: brandDefaults.tagline,
      announcement: "Sample book catalog. Payments without Paystack keys stay simulated.",
      heroTitle: "Books from sellers across Ghana.",
      heroSubtitle: "One catalog of books. Each seller fulfills their own orders. Cash on delivery where the zone allows it.",
      heroPrimaryLabel: "Browse books",
      heroSecondaryLabel: "Sell on LZRE Books",
      heroBadge: "Ghana",
    },
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
      announcement: "Sample book catalog. Payments without Paystack keys stay simulated.",
      announcementActive: true,
      heroTitle: "Books from sellers across Ghana.",
      heroSubtitle: "One catalog of books. Each seller fulfills their own orders. Cash on delivery where the zone allows it.",
      heroPrimaryLabel: "Browse books",
      heroPrimaryHref: "/products",
      heroSecondaryLabel: "Sell on LZRE Books",
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
  await prisma.category.updateMany({
    where: { slug: { notIn: categories.map(([, slug]) => slug) } },
    data: { visible: false },
  });

  const brand = await prisma.brand.upsert({
    where: { slug: "lzre-basics" },
    update: { name: "LZRE Books", description: "Books in the LZRE Books sample catalog.", featured: true, visible: true },
    create: { name: "LZRE Books", slug: "lzre-basics", description: "Books in the LZRE Books sample catalog.", featured: true },
  });
  await prisma.brand.upsert({
    where: { slug: "northstar" },
    update: { visible: false, featured: false },
    create: { name: "Northstar", slug: "northstar", description: "Second demonstration brand.", featured: false, visible: false },
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
    ["about", "About LZRE Books", "What LZRE Books is.", "LZRE Books is a multi-seller bookshop. Customers pay once. Each seller fulfills their own books.\n\n## Demonstration data\n\nSample titles, shipping rates, and tax components are labeled as demonstration data. They are not offers or legal advice."],
    ["shipping", "Shipping", "How delivery works.", "Delivery estimates come from the shipping method you choose at checkout.\n\n## Tracking\n\nA seller can store a carrier name and a tracking number. LZRE Books does not contact the courier and does not show live location.\n\nSeeded prices are demonstration rates."],
    ["returns", "Returns", "How returns work.", "A return can be requested after an order is marked delivered, inside the return window set by an administrator.\n\n## Refunds\n\nAn online refund is recorded only when the payment provider confirms it. An administrator can record an offline refund after the money has actually been returned."],
    ["privacy", "Privacy", "How LZRE Books handles personal information.", "LZRE Books stores the account, order, and seller information needed to run the bookshop.\n\n## Your requests\n\nUse the privacy request form to ask for access or deletion. Marketing email is sent only after you consent.\n\nThis page describes the product's controls. It is not a certification under the Ghana Data Protection Act."],
    ["terms", "Terms", "Marketplace terms.", "By placing an order you buy from the marketplace, which then splits the order among the sellers whose items you chose.\n\n## Payments\n\nCard and mobile money payments are marked paid only after a verified Paystack webhook. Cash on delivery stays unpaid until collection is recorded. A sandbox checkout is labeled simulated and is not a payment."],
    ["selling", "Selling on LZRE Books", "How selling works.", "Create a customer account, then submit a seller application. Books stay off the storefront until an administrator approves them.\n\n## Commission\n\nCommission is calculated on the server from the administrator's rate. Sellers cannot change it. Payouts stay pending until a Paystack subaccount exists or an administrator records a manual payout."],
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

  const heroCopy = {
    title: "Books for every reader",
    subtitle: "Fiction, school books, and stories from Ghana. These titles are sample catalog data.",
    ctaLabel: "Browse books",
    ctaHref: "/products",
    badge: "Ghana",
    active: true,
  };
  const live = await prisma.promotion.findFirst({ where: { placement: "HERO", active: true }, orderBy: { sortOrder: "asc" } });
  if (!live) {
    await prisma.promotion.create({ data: { placement: "HERO", ...heroCopy } });
  } else {
    await prisma.promotion.update({ where: { id: live.id }, data: heroCopy });
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
    update: { active: true, name: "LZRE Books", description: "Demonstration bookshop. The titles here are sample catalog data, not live inventory from an independent seller." },
    create: {
      sellerId: seller.id,
      name: "LZRE Books",
      slug: "lzre-platform-store",
      description: "Demonstration bookshop. The titles here are sample catalog data, not live inventory from an independent seller.",
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
      update: {
        status: "APPROVED",
        name: item.name,
        categoryId: category.id,
        brandId: brand.id,
        description: item.blurb,
        fromPrice: item.price,
        compareFromPrice: item.compare,
        weightGrams: item.weight,
        isFeatured: item.featured,
      },
      create: {
        sellerId: seller.id,
        categoryId: category.id,
        brandId: brand.id,
        name: item.name,
        slug: item.slug,
        description: item.blurb,
        condition: "NEW",
        status: "APPROVED",
        currency: brandDefaults.currency,
        fromPrice: item.price,
        compareFromPrice: item.compare,
        weightGrams: item.weight,
        isFeatured: item.featured,
        publishedAt: new Date(),
        metaTitle: item.name,
        metaDescription: item.blurb,
      },
    });
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({ data: { productId: product.id, url: `/products/${item.slug}.jpg`, alt: item.name, isPrimary: true } });
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

  await prisma.product.updateMany({
    where: { slug: { notIn: products.map((item) => item.slug) }, status: { not: "ARCHIVED" } },
    data: { status: "ARCHIVED" },
  });

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
