export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type FulfillmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "RETURNED";

const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAID: ["PROCESSING", "CONFIRMED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"],
  PROCESSING: ["CONFIRMED", "PACKED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"],
  CONFIRMED: ["PACKED", "PROCESSING", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["REFUNDED", "PARTIALLY_REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ["REFUNDED", "PARTIALLY_REFUNDED"],
};

const fulfillmentTransitions: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["RETURN_REQUESTED"],
  CANCELLED: [],
  RETURN_REQUESTED: ["RETURNED", "DELIVERED"],
  RETURNED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus, flags?: { paymentVerified?: boolean; simulated?: boolean }) {
  if (from === to) return true;
  if (from === "PENDING_PAYMENT" && to === "PAID" && flags?.paymentVerified) return true;
  if (from === "PENDING_PAYMENT" && to === "PROCESSING" && flags?.simulated) return true;
  return orderTransitions[from].includes(to);
}

export function canTransitionFulfillment(from: FulfillmentStatus, to: FulfillmentStatus) {
  if (from === to) return true;
  return fulfillmentTransitions[from].includes(to);
}

export function sandboxSettlement() {
  return { paymentStatus: "SIMULATED" as const, orderStatus: "PROCESSING" as const, paid: false as const };
}
