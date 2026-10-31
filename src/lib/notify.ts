import { prisma } from "@/lib/db";
import { log } from "@/lib/log";

export async function notifyUser(userId: string, input: { type: "ACCOUNT" | "ORDER" | "PAYMENT" | "SHIPMENT" | "REFUND" | "SELLER" | "PRODUCT" | "INVENTORY" | "SYSTEM"; title: string; body: string; href?: string }) {
  const preference = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (preference && !preference.inApp) return;
  await prisma.notification.create({ data: { userId, type: input.type, title: input.title, body: input.body, href: input.href } });
}

export async function audit(actorId: string | null, action: string, entityType: string, entityId: string, metadata?: Record<string, unknown>) {
  await prisma.auditLog.create({
    data: { actorId, action, entityType, entityId, metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined },
  });
  log("info", "audit", { action, entityType, entityId, actorId });
}
