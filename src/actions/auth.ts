"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { mergeGuestCommerce } from "@/actions/cart";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { hashPassword, verifyPassword } from "@/lib/password";
import { notifyUser } from "@/lib/notify";
import { rateLimit } from "@/lib/security/rate-limit";
import { randomBytes, createHash } from "crypto";
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "@/lib/validation/schemas";

async function ip() {
  const headerStore = await headers();
  return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function registerAction(_state: { message: string }, formData: FormData) {
  const limit = rateLimit(`register:${await ip()}`, 8, 15 * 60_000);
  if (!limit.allowed) return { message: "Too many attempts. Wait a few minutes and try again." };
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    marketingConsent: formData.get("marketingConsent") === "true",
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the form." };
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { message: "An account with that email already exists." };
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      passwordHash: await hashPassword(parsed.data.password),
      marketingConsent: parsed.data.marketingConsent,
      roles: ["CUSTOMER"],
      customerProfile: { create: {} },
      notificationPreference: { create: { marketingEmail: parsed.data.marketingConsent } },
    },
  });
  const token = randomBytes(32).toString("hex");
  await prisma.authToken.create({
    data: { userId: user.id, type: "EMAIL_VERIFY", tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) },
  });
  const link = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/verify-email?token=${token}`;
  const email = await sendEmail({ to: user.email, template: "verify-email", subject: "Verify your LZRE email", body: `Verify your email: ${link}` });
  await notifyUser(user.id, { type: "ACCOUNT", title: "Welcome to LZRE", body: email.delivered ? "Check your email to verify this account." : "Your account is ready. Email delivery is not configured, so the verification message was only saved." });
  await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirect: false });
  await mergeGuestCommerce(user.id);
  redirect("/account");
}

export async function loginAction(_state: { message: string }, formData: FormData) {
  const limit = rateLimit(`login:${await ip()}`, 10, 15 * 60_000);
  if (!limit.allowed) return { message: "Too many sign-in attempts. Wait and try again." };
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the form." };
  try {
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return { message: "The email or password is incorrect, or the account cannot sign in." };
    throw error;
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) await mergeGuestCommerce(user.id);
  const callback = String(formData.get("callbackUrl") ?? "/account");
  redirect(callback.startsWith("/") && !callback.startsWith("//") ? callback : "/account");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export async function forgotPasswordAction(_state: { message: string }, formData: FormData) {
  const limit = rateLimit(`forgot:${await ip()}`, 5, 15 * 60_000);
  if (!limit.allowed) return { message: "Too many reset requests. Wait and try again." };
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { message: "Enter a valid email address." };
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user && user.status === "ACTIVE") {
    const token = randomBytes(32).toString("hex");
    await prisma.authToken.create({
      data: { userId: user.id, type: "PASSWORD_RESET", tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 1000 * 60 * 30) },
    });
    const link = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    await sendEmail({ to: user.email, template: "password-reset", subject: "Reset your LZRE password", body: `Reset your password: ${link}` });
  }
  return { message: "If an account exists, a reset message was queued. It is only delivered when email is configured." };
}

export async function resetPasswordAction(_state: { message: string }, formData: FormData) {
  const parsed = resetSchema.safeParse({ token: formData.get("token"), password: formData.get("password") });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the form." };
  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const row = await prisma.authToken.findUnique({ where: { tokenHash } });
  if (!row || row.type !== "PASSWORD_RESET" || row.usedAt || row.expiresAt < new Date()) return { message: "This reset link is invalid or expired." };
  await prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  await prisma.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  redirect("/login");
}

export async function verifyPasswordForUser(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  return verifyPassword(password, user.passwordHash);
}
