// The one place the money maths lives, so a day total and the trip budget can
// never disagree. It sums a set of priced things two ways: an average estimate
// from the representative figure of each, and a conservative ceiling from the
// higher figure of each. The budget is derived here, never stored, so it cannot
// drift from the plan.

export type Priced = {
  price: number | null; // representative party figure, the average
  priceMax: number | null; // conservative party figure; null means no spread
  isEstimated: boolean;
};

export type Rollup = {
  average: number; // realistic middle
  ceiling: number; // the number you will not exceed if things run expensive
  count: number;
  hasEstimate: boolean; // any figure in the sum is a marked estimate
  allEstimated: boolean; // every figure in the sum is a marked estimate
};

// Representative figure: the average estimate uses this. Falls back to the
// conservative figure, then to zero, so a missing number counts as nothing
// rather than breaking the sum.
function representative(p: Priced): number {
  return p.price ?? p.priceMax ?? 0;
}

// Conservative figure: the ceiling uses this. Falls back to the representative
// figure when there is no spread.
function conservative(p: Priced): number {
  return p.priceMax ?? p.price ?? 0;
}

export function rollup(items: Priced[]): Rollup {
  let average = 0;
  let ceiling = 0;
  let estimated = 0;
  for (const it of items) {
    average += representative(it);
    ceiling += conservative(it);
    if (it.isEstimated) estimated++;
  }
  return {
    average,
    ceiling,
    count: items.length,
    hasEstimate: estimated > 0,
    allEstimated: items.length > 0 && estimated === items.length,
  };
}

// The trip budget rolls every item across every day into the same two figures,
// carries the currency, and compares them against the traveller's optional
// maximum. It is derived on read from the items, never stored, so it always
// reflects the current plan.
export type TripBudget = Rollup & {
  currency: string;
  limit: number | null; // the traveller's optional maximum
  overLimit: boolean; // the realistic middle sits above the maximum
  overBy: number; // how far the average exceeds the maximum, 0 when under
};

export function computeTripBudget(
  items: Priced[],
  opts: { currency: string; limit?: number | null }
): TripBudget {
  const base = rollup(items);
  const limit = opts.limit ?? null;
  // Warn on the realistic middle crossing the maximum, not the worst case, so
  // the warning means the plan is actually over rather than merely at risk.
  const overLimit = limit != null && base.average > limit;
  return {
    ...base,
    currency: opts.currency,
    limit,
    overLimit,
    overBy: overLimit ? base.average - (limit as number) : 0,
  };
}
