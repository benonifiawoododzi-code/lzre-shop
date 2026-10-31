import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const row = await prisma.authToken.findUnique({ where: { tokenHash } });
  if (!row || row.type !== "EMAIL_VERIFY" || row.usedAt || row.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/account?verified=0", request.url));
  }
  await prisma.user.update({ where: { id: row.userId }, data: { emailVerified: new Date() } });
  await prisma.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return NextResponse.redirect(new URL("/account?verified=1", request.url));
}
