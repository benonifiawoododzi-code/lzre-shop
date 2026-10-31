import { z } from "zod";
import { ghanaRegions } from "@/config/ghana";

export const passwordSchema = z.string().min(12, "Use at least 12 characters.").regex(/[A-Za-z]/, "Include a letter.").regex(/\d/, "Include a number.");

export const emailSchema = z.string().trim().email("Enter a valid email address.").max(180).transform((value) => value.toLowerCase());

export const ghanaPhoneSchema = z
  .string()
  .trim()
  .regex(/^(\+233|0)[235]\d{8}$/, "Enter a Ghana phone number, such as 0240000000 or +233240000000.");

export const ghanaPostSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}-\d{3,4}-\d{4}$/, "Enter a GhanaPost GPS address such as GA-123-4567.")
  .or(z.literal(""))
  .optional();

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: emailSchema,
  phone: ghanaPhoneSchema,
  password: passwordSchema,
  marketingConsent: z.boolean().default(false),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z.object({
  token: z.string().min(20),
  password: passwordSchema,
});

export const addressSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: ghanaPhoneSchema,
  line1: z.string().trim().min(3).max(160),
  line2: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(80),
  region: z.enum(ghanaRegions),
  ghanaPostGps: ghanaPostSchema,
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  instructions: z.string().trim().max(240).optional().or(z.literal("")),
  isDefault: z.boolean().default(false),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  topic: z.string().trim().min(2).max(80),
  message: z.string().trim().min(10).max(2000),
});

export const newsletterSchema = z.object({
  email: emailSchema,
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required before we save your email." }) }),
});

export const privacyRequestSchema = z.object({
  email: emailSchema,
  type: z.enum(["export", "deletion"]),
  detail: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const reviewSchema = z.object({
  orderItemId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(80),
  body: z.string().trim().min(10).max(2000),
});

export const questionSchema = z.object({
  productId: z.string().min(1),
  body: z.string().trim().min(10).max(1000),
});

export const sellerApplicationSchema = z.object({
  storeName: z.string().trim().min(2).max(80),
  description: z.string().trim().min(20).max(600),
  businessType: z.enum(["INDIVIDUAL", "REGISTERED_BUSINESS"]),
  legalName: z.string().trim().min(2).max(120),
  registrationNo: z.string().trim().max(60).optional().or(z.literal("")),
  tin: z.string().trim().max(40).optional().or(z.literal("")),
  phone: ghanaPhoneSchema,
  city: z.string().trim().min(2).max(80),
  region: z.enum(ghanaRegions),
  payoutType: z.enum(["BANK", "MOBILE_MONEY"]),
  bankName: z.string().trim().max(80).optional().or(z.literal("")),
  accountName: z.string().trim().max(80).optional().or(z.literal("")),
  accountNumber: z.string().trim().max(40).optional().or(z.literal("")),
  momoNetwork: z.enum(["MTN", "TELECEL", "AIRTELTIGO"]).optional().or(z.literal("")),
  momoNumber: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
}).superRefine((value, context) => {
  if (value.businessType === "REGISTERED_BUSINESS" && !value.registrationNo) {
    context.addIssue({ code: "custom", path: ["registrationNo"], message: "Enter the business registration number." });
  }
  if (value.payoutType === "BANK" && (!value.bankName || !value.accountName || !value.accountNumber)) {
    context.addIssue({ code: "custom", path: ["accountNumber"], message: "Enter the bank name, account name, and account number." });
  }
  if (value.payoutType === "MOBILE_MONEY") {
    if (!value.momoNetwork) context.addIssue({ code: "custom", path: ["momoNetwork"], message: "Choose a mobile money network." });
    if (!value.momoNumber || !/^(\+233|0)[235]\d{8}$/.test(value.momoNumber)) {
      context.addIssue({ code: "custom", path: ["momoNumber"], message: "Enter the mobile money number." });
    }
  }
});

export const variantSchema = z.object({
  sku: z.string().trim().min(2).max(40),
  name: z.string().trim().min(1).max(80),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a price such as 199.00"),
  compareAtPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().or(z.literal("")),
  stock: z.coerce.number().int().min(0).max(100000),
  options: z.record(z.string().trim().min(1).max(40)).default({}),
});

export const productSchema = z.object({
  name: z.string().trim().min(2).max(140),
  description: z.string().trim().min(20).max(8000),
  categoryId: z.string().min(1),
  brandName: z.string().trim().max(80).optional().or(z.literal("")),
  condition: z.enum(["NEW", "REFURBISHED", "USED"]),
  currency: z.string().trim().length(3),
  weightGrams: z.coerce.number().int().min(0).max(100000),
  lowStockThreshold: z.coerce.number().int().min(0).max(10000),
  metaTitle: z.string().trim().max(70).optional().or(z.literal("")),
  metaDescription: z.string().trim().max(160).optional().or(z.literal("")),
  attributes: z.array(z.object({ name: z.string().trim().min(1).max(40), value: z.string().trim().min(1).max(80) })).max(30),
  variants: z.array(variantSchema).min(1).max(30),
});

export const checkoutDetailsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  phone: ghanaPhoneSchema,
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export const returnSchema = z.object({
  orderItemId: z.string().min(1),
  reason: z.enum(["DAMAGED", "WRONG_ITEM", "NOT_AS_DESCRIBED", "CHANGED_MIND", "OTHER"]),
  description: z.string().trim().min(10).max(1000),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: ghanaPhoneSchema,
  marketingConsent: z.boolean().default(false),
  orderEmail: z.boolean().default(true),
});
