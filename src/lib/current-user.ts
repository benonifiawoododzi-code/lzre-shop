import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { newGuestKey, readSignedValue, signValue } from "@/lib/security/tokens";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { sellerProfile: { include: { store: true } }, customerProfile: true, notificationPreference: true },
  });
  if (!user || user.deletedAt || user.status !== "ACTIVE") return null;
  return user;
}

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) return null;
  return value;
}

export async function readGuestKey() {
  const key = secret();
  if (!key) return null;
  const jar = await cookies();
  return readSignedValue(jar.get("lzre_guest")?.value, key);
}

export async function ensureGuestKey() {
  const existing = await readGuestKey();
  if (existing) return existing;
  const key = secret();
  if (!key) throw new Error("AUTH_SECRET must be at least 32 characters.");
  const guest = newGuestKey();
  const jar = await cookies();
  jar.set("lzre_guest", signValue(guest, key), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return guest;
}

export async function rememberOrder(orderId: string) {
  const key = secret();
  if (!key) return;
  const jar = await cookies();
  jar.set("lzre_receipt", signValue(orderId, key), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function hasOrderReceipt(orderId: string) {
  const key = secret();
  if (!key) return false;
  const jar = await cookies();
  return readSignedValue(jar.get("lzre_receipt")?.value, key) === orderId;
}
