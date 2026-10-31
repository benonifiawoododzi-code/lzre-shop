import { Star } from "lucide-react";

export function Rating({ value, count }: { value: number; count: number }) {
  const filled = count < 1 ? 0 : Math.max(0, Math.min(5, Math.round(value)));
  return (
    <p className="inline-flex items-center gap-1 text-xs text-muted">
      <span aria-hidden="true" className="inline-flex">
        {Array.from({ length: 5 }, (_, index) => (
          <Star className={index < filled ? "size-3.5 fill-warning text-warning" : "size-3.5 text-line"} key={index} />
        ))}
      </span>
      <span className="sr-only">{count < 1 ? "No reviews yet" : `${value.toFixed(1)} from ${count} reviews`}</span>
      <span aria-hidden="true">{count < 1 ? "No reviews yet" : `(${count})`}</span>
    </p>
  );
}
