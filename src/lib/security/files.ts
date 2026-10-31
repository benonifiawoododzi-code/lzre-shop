export function sniffImage(buffer: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function validateImageMeta(type: string, size: number) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) return "Use a JPEG, PNG, or WebP image.";
  if (size > 5 * 1024 * 1024) return "Images must be 5 MB or smaller.";
  if (size < 1) return "The file is empty.";
  return null;
}

export function sniffDocument(buffer: Uint8Array): "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | null {
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return "application/pdf";
  return sniffImage(buffer);
}
