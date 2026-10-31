export function cedisToPesewas(value: string | number): number {
  const raw = typeof value === "number" ? value.toFixed(2) : value.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(raw)) {
    throw new Error("Invalid money value");
  }
  const negative = raw.startsWith("-");
  const unsigned = raw.replace("-", "");
  const [whole, fraction = ""] = unsigned.split(".");
  const pesewas = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return negative ? -pesewas : pesewas;
}

export function pesewasToDecimal(pesewas: number): string {
  const sign = pesewas < 0 ? "-" : "";
  const absolute = Math.abs(Math.trunc(pesewas));
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
}

export function formatMoney(pesewas: number, currency: string): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(pesewas / 100);
}

export function discountPercent(price: number, compareAt: number | null | undefined): number | null {
  if (compareAt == null || compareAt <= price || price < 0) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
