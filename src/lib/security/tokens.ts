import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export function signValue(value: string, secret: string) {
  const signature = createHmac("sha256", secret).update(value).digest("base64url");
  return `${value}.${signature}`;
}

export function readSignedValue(signed: string | undefined, secret: string) {
  if (!signed || !secret) return null;
  const index = signed.lastIndexOf(".");
  if (index <= 0) return null;
  const value = signed.slice(0, index);
  const expected = signValue(value, secret);
  const left = Buffer.from(signed);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return null;
  if (!timingSafeEqual(left, right)) return null;
  return value;
}

export function newGuestKey() {
  return randomBytes(16).toString("base64url");
}

export function safeInternalPath(href: string) {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\") || href.includes("://")) return null;
  return href;
}

export function isPromotionLive(promo: { active: boolean; startsAt: Date | null; endsAt: Date | null }, now: Date) {
  if (!promo.active) return false;
  if (promo.startsAt && promo.startsAt > now) return false;
  if (promo.endsAt && promo.endsAt < now) return false;
  return true;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function formatOrderNumber(date: Date, suffix: string) {
  if (!/^[A-Z2-9]{6}$/.test(suffix)) throw new Error("Invalid order suffix");
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `LZ${year}${month}${day}${suffix}`;
}

export function randomOrderSuffix() {
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}
