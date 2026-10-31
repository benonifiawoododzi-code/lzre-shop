import { NextResponse } from "next/server";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const safe = slug.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "lzre";
  const hue = [...safe].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 40;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="#ebe4d8"/>
  <rect x="170" y="150" width="460" height="500" fill="#0c1c2e"/>
  <rect x="230" y="230" width="340" height="220" fill="#f6f3ee"/>
  <circle cx="400" cy="520" r="${28 + hue}" fill="#0e6bff"/>
  <text x="400" y="720" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#0c1c2e">${safe.slice(0, 18)}</text>
</svg>`;
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
}
