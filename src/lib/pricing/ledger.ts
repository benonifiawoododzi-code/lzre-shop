export type LedgerAccount = "CASH" | "COD_RECEIVABLE" | "SELLER_PAYABLE" | "COMMISSION_REVENUE" | "REFUND";
export type LedgerDirection = "DEBIT" | "CREDIT";

export type LedgerLine = {
  account: LedgerAccount;
  direction: LedgerDirection;
  amount: number;
  sellerId?: string;
  memo: string;
};

export function ledgerTotals(lines: LedgerLine[]) {
  const debit = lines.filter((line) => line.direction === "DEBIT").reduce((sum, line) => sum + line.amount, 0);
  const credit = lines.filter((line) => line.direction === "CREDIT").reduce((sum, line) => sum + line.amount, 0);
  return { debit, credit, balanced: debit === credit };
}

export function saleLedger(
  sellers: Array<{ sellerId: string; commission: number; payable: number }>,
  source: "CASH" | "COD_RECEIVABLE",
): LedgerLine[] {
  const total = sellers.reduce((sum, seller) => sum + seller.commission + seller.payable, 0);
  const lines: LedgerLine[] = [{ account: source, direction: "DEBIT", amount: total, memo: source === "CASH" ? "Customer payment" : "Cash on delivery receivable" }];
  for (const seller of sellers) {
    if (seller.commission > 0) {
      lines.push({ account: "COMMISSION_REVENUE", direction: "CREDIT", amount: seller.commission, sellerId: seller.sellerId, memo: "Marketplace commission" });
    }
    if (seller.payable > 0) {
      lines.push({ account: "SELLER_PAYABLE", direction: "CREDIT", amount: seller.payable, sellerId: seller.sellerId, memo: "Seller payable" });
    }
  }
  return lines.filter((line) => line.amount > 0);
}

export function codCollectionLedger(amount: number): LedgerLine[] {
  return [
    { account: "CASH", direction: "DEBIT", amount, memo: "Cash collected on delivery" },
    { account: "COD_RECEIVABLE", direction: "CREDIT", amount, memo: "Cash on delivery collected" },
  ];
}

export function payoutLedger(amount: number, sellerId: string): LedgerLine[] {
  return [
    { account: "SELLER_PAYABLE", direction: "DEBIT", amount, sellerId, memo: "Seller payout" },
    { account: "CASH", direction: "CREDIT", amount, memo: "Seller payout" },
  ];
}

export function refundLedger(input: { amount: number; commissionReversal: number; sellerClawback: number }) {
  if (input.amount < 0 || input.commissionReversal < 0 || input.sellerClawback < 0) {
    return { ok: false as const, message: "Refund amounts cannot be negative." };
  }
  if (input.commissionReversal + input.sellerClawback !== input.amount) {
    return { ok: false as const, message: "The refund split does not match the refund amount." };
  }
  const lines: LedgerLine[] = [];
  if (input.commissionReversal > 0) lines.push({ account: "COMMISSION_REVENUE", direction: "DEBIT", amount: input.commissionReversal, memo: "Commission reversal" });
  if (input.sellerClawback > 0) lines.push({ account: "SELLER_PAYABLE", direction: "DEBIT", amount: input.sellerClawback, memo: "Seller balance reduction" });
  lines.push({ account: "CASH", direction: "CREDIT", amount: input.amount, memo: "Customer refund" });
  return { ok: true as const, lines };
}
