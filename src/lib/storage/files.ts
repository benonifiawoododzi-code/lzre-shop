import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { sniffDocument, sniffImage } from "@/lib/security/files";

const publicRoot = path.join(process.cwd(), "public", "uploads");
const privateRoot = path.join(process.cwd(), "storage", "private");

function extension(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  return "jpg";
}

export function storageConfigured() {
  return Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
}

export async function savePublicImage(buffer: Buffer, alt: string) {
  const mime = sniffImage(buffer);
  if (!mime) return { ok: false as const, message: "The file is not a JPEG, PNG, or WebP image." };
  if (buffer.length > 5 * 1024 * 1024) return { ok: false as const, message: "Images must be 5 MB or smaller." };
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${extension(mime)}`;
  await mkdir(publicRoot, { recursive: true });
  await writeFile(path.join(publicRoot, name), buffer);
  return { ok: true as const, url: `/uploads/${name}`, mime, alt, storage: storageConfigured() ? "s3-configured-but-local-adapter-active" : "local" };
}

export async function savePrivateFile(buffer: Buffer, originalName: string) {
  const mime = sniffDocument(buffer);
  if (!mime) return { ok: false as const, message: "Upload a PDF, JPEG, PNG, or WebP file." };
  if (buffer.length > 8 * 1024 * 1024) return { ok: false as const, message: "Documents must be 8 MB or smaller." };
  const name = `${Date.now()}-${randomBytes(8).toString("hex")}.${extension(mime)}`;
  await mkdir(privateRoot, { recursive: true });
  await writeFile(path.join(privateRoot, name), buffer);
  return { ok: true as const, path: name, mime, fileName: originalName.slice(0, 120), size: buffer.length };
}

export function privateFilePath(name: string) {
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return null;
  const full = path.join(privateRoot, name);
  if (!full.startsWith(privateRoot)) return null;
  return full;
}
