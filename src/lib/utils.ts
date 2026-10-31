import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
  return slug || "item";
}

export function parsePage(value: string | undefined) {
  const page = Number(value ?? "1");
  if (!Number.isInteger(page) || page < 1 || page > 200) return 1;
  return page;
}

export function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
