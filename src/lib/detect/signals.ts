export type PriceRow = { price: number; observed_at: string };

// Discriminated on fire so a checked signal carries a non-null reason. The
// evidence rides along so alert copy can state the arithmetic it fired on
// (P9): how many stored readings backed the decision and the prior floor.
export type FiredSignal = {
  fire: true;
  reason: "mistake" | "threshold" | "percentile" | "drop";
  context: string;
  evidence: { readings: number; floor: number | null };
};

export type Signal = FiredSignal | { fire: false; reason: null; context: string };

function percentile(values: number[], p: number): number {
  if (values.length === 0) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

export function evaluate(
  current: number,
  history: PriceRow[],
  targetPrice: number | null
): Signal {
  const prices = history.map((h) => h.price);
  const floor = Math.min(...prices, Infinity);
  const p10 = percentile(prices, 10);
  const evidence = {
    readings: prices.length,
    floor: floor === Infinity ? null : floor,
  };

  // need a minimum history before percentile logic is trustworthy
  const enoughHistory = prices.length >= 20;

  // 1. Mistake fare: absurdly below the established floor
  if (enoughHistory && floor !== Infinity && current < floor * 0.55) {
    return {
      fire: true,
      reason: "mistake",
      context: `current ${current} is below 55% of floor ${floor}`,
      evidence,
    };
  }

  // 2. Manual threshold: you told it what you would pay
  if (targetPrice != null && current <= targetPrice) {
    return {
      fire: true,
      reason: "threshold",
      context: `current ${current} at or below target ${targetPrice}`,
      evidence,
    };
  }

  // 3. Percentile: cheaper than 90% of everything seen
  if (enoughHistory && current <= p10) {
    return {
      fire: true,
      reason: "percentile",
      context: `current ${current} at or below p10 ${p10}`,
      evidence,
    };
  }

  // 4. Sudden drop versus the most recent reading
  if (history.length >= 2) {
    const last = history[0].price; // history sorted desc by time
    if (last > 0 && current <= last * 0.8) {
      return {
        fire: true,
        reason: "drop",
        context: `current ${current} is 20%+ below last ${last}`,
        evidence,
      };
    }
  }

  return { fire: false, reason: null, context: "" };
}
