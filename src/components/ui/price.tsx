import { formatMoney } from "@/lib/pricing/money";

export function Price({ amount, compare, currency, className }: { amount: number; compare?: number | null; currency: string; className?: string }) {
  return (
    <p className={className}>
      <span className="font-semibold text-navy">{formatMoney(amount, currency)}</span>
      {compare && compare > amount ? <span className="ml-2 text-sm text-muted line-through">{formatMoney(compare, currency)}</span> : null}
    </p>
  );
}
