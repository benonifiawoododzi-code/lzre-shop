import { Star } from "lucide-react";

export function Rating({ value, count }: { value: number; count: number }) {
  if (count < 1) return <p className="text-sm text-muted">No reviews yet</p>;
  return (
    <p className="inline-flex items-center gap-1 text-sm text-ink">
      <Star aria-hidden="true" className="size-4 fill-navy text-navy" />
      <span>{value.toFixed(1)}</span>
      <span className="text-muted">({count})</span>
    </p>
  );
}
