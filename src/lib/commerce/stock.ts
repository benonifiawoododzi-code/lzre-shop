import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function reserveStock(tx: Tx, variantId: string, quantity: number) {
  const updated = await tx.$executeRaw`
    UPDATE "Inventory"
    SET available = "onHand" - (reserved + ${quantity}),
        reserved = reserved + ${quantity},
        "updatedAt" = NOW()
    WHERE "variantId" = ${variantId}
      AND ("onHand" - reserved) >= ${quantity}
  `;
  if (updated !== 1) return false;
  const inventory = await tx.inventory.findUnique({ where: { variantId } });
  if (!inventory) return false;
  await tx.inventoryMovement.create({ data: { inventoryId: inventory.id, quantity, reason: "RESERVATION" } });
  return true;
}

export async function commitStock(tx: Tx, variantId: string, quantity: number, actorId?: string, countAsSale = true) {
  const updated = await tx.$executeRaw`
    UPDATE "Inventory"
    SET "onHand" = "onHand" - ${quantity},
        reserved = reserved - ${quantity},
        available = ("onHand" - ${quantity}) - (reserved - ${quantity}),
        "updatedAt" = NOW()
    WHERE "variantId" = ${variantId}
      AND reserved >= ${quantity}
      AND "onHand" >= ${quantity}
  `;
  if (updated !== 1) return false;
  const inventory = await tx.inventory.findUnique({ where: { variantId }, include: { variant: { include: { product: true } } } });
  if (!inventory) return false;
  await tx.inventoryMovement.create({ data: { inventoryId: inventory.id, quantity: -quantity, reason: "SALE", actorId } });
  if (countAsSale) await tx.product.update({ where: { id: inventory.variant.productId }, data: { salesCount: { increment: quantity } } });
  return inventory;
}

export async function releaseStock(tx: Tx, variantId: string, quantity: number) {
  const updated = await tx.$executeRaw`
    UPDATE "Inventory"
    SET reserved = reserved - ${quantity},
        available = "onHand" - (reserved - ${quantity}),
        "updatedAt" = NOW()
    WHERE "variantId" = ${variantId}
      AND reserved >= ${quantity}
  `;
  if (updated !== 1) return false;
  const inventory = await tx.inventory.findUnique({ where: { variantId } });
  if (!inventory) return false;
  await tx.inventoryMovement.create({ data: { inventoryId: inventory.id, quantity: -quantity, reason: "RELEASE" } });
  return true;
}

export async function restoreCommittedStock(tx: Tx, variantId: string, quantity: number, actorId?: string) {
  const updated = await tx.$executeRaw`
    UPDATE "Inventory"
    SET "onHand" = "onHand" + ${quantity},
        available = ("onHand" + ${quantity}) - reserved,
        "updatedAt" = NOW()
    WHERE "variantId" = ${variantId}
  `;
  if (updated !== 1) return false;
  const inventory = await tx.inventory.findUnique({ where: { variantId }, include: { variant: true } });
  if (!inventory) return false;
  await tx.inventoryMovement.create({ data: { inventoryId: inventory.id, quantity, reason: "CANCEL", actorId } });
  await tx.$executeRaw`
    UPDATE "Product"
    SET "salesCount" = GREATEST("salesCount" - ${quantity}, 0)
    WHERE id = ${inventory.variant.productId}
  `;
  return true;
}

export async function setOnHand(tx: Tx, variantId: string, onHand: number, actorId?: string) {
  const inventory = await tx.inventory.findUnique({ where: { variantId } });
  if (!inventory) return false;
  if (onHand < inventory.reserved) return false;
  const delta = onHand - inventory.onHand;
  await tx.inventory.update({
    where: { variantId },
    data: { onHand, available: onHand - inventory.reserved },
  });
  await tx.inventoryMovement.create({ data: { inventoryId: inventory.id, quantity: delta, reason: "ADJUSTMENT", actorId } });
  return true;
}
