export function availableToSell(onHand: number, reserved: number) {
  return Math.max(0, onHand - reserved);
}

export function planReserve(onHand: number, reserved: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) return { ok: false as const, reason: "invalid_quantity" as const };
  if (availableToSell(onHand, reserved) < quantity) return { ok: false as const, reason: "insufficient_stock" as const };
  return { ok: true as const, reserved: reserved + quantity };
}

export function planCommit(onHand: number, reserved: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || reserved < quantity || onHand < quantity) {
    return { ok: false as const, reason: "inconsistent" as const };
  }
  return { ok: true as const, onHand: onHand - quantity, reserved: reserved - quantity };
}

export function planRelease(reserved: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || reserved < quantity) {
    return { ok: false as const, reason: "inconsistent" as const };
  }
  return { ok: true as const, reserved: reserved - quantity };
}
