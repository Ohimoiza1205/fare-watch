import { formatMoneyRange } from "@/lib/planner/format";

// The one place a price is drawn, so confirmed and estimated can never converge.
// The distinction is form, not colour. A confirmed figure is the brightest ink,
// solid. An estimate is dimmer, prefixed with a tilde, and tagged. A reader
// tells them apart before reading a word, and colour is left free for status.

export function PriceTag({
  price,
  priceMax,
  currency,
  isEstimated,
  className = "",
}: {
  price: number | null;
  priceMax: number | null;
  currency: string;
  isEstimated: boolean;
  className?: string;
}) {
  if (price == null && priceMax == null) {
    return <span className={`text-sm ink-4 ${className}`}>no price</span>;
  }

  const lo = price ?? priceMax!;
  const hi = priceMax ?? price!;
  const text = formatMoneyRange(lo, hi, currency);

  if (!isEstimated) {
    return (
      <span
        className={`num ink-0 ${className}`}
        title="Confirmed price from a real source"
      >
        {text}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-baseline gap-1.5 num ink-2 ${className}`}
      title="Estimated. No confirmed price was found."
    >
      <span aria-hidden="true" className="ink-3">~</span>
      <span>{text}</span>
      <span
        className="rounded-[3px] border px-1 py-px text-[0.6rem] uppercase leading-none tracking-wide ink-3"
        style={{ borderColor: "var(--hairline-strong)" }}
      >
        est
      </span>
    </span>
  );
}
