export type Actor = {
  id: string;
  roles: Array<"CUSTOMER" | "SELLER" | "ADMIN">;
  sellerId?: string | null;
  status: "ACTIVE" | "SUSPENDED";
};

function active(actor: Actor) {
  return actor.status === "ACTIVE";
}

export function canReadOrder(actor: Actor, orderUserId: string | null) {
  if (!active(actor)) return false;
  if (actor.roles.includes("ADMIN")) return true;
  return orderUserId != null && actor.id === orderUserId;
}

export function canManageSellerOrder(actor: Actor, sellerId: string) {
  if (!active(actor)) return false;
  if (actor.roles.includes("ADMIN")) return true;
  return actor.roles.includes("SELLER") && actor.sellerId === sellerId;
}

export function canSetCommission(actor: Actor) {
  return active(actor) && actor.roles.includes("ADMIN");
}

export function canReviewSeller(actor: Actor) {
  return active(actor) && actor.roles.includes("ADMIN");
}

export function canPublishProduct(actor: Actor, productSellerId: string, sellerStatus: string) {
  if (!active(actor) || sellerStatus !== "APPROVED") return false;
  if (actor.roles.includes("ADMIN")) return true;
  return actor.roles.includes("SELLER") && actor.sellerId === productSellerId;
}

export function canModerateCatalog(actor: Actor) {
  return active(actor) && actor.roles.includes("ADMIN");
}
