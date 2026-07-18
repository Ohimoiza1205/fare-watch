// Converts the estimate baselines, which are declared in USD, into the trip's
// display currency. Estimates only: a real published price never passes
// through this table, it keeps the currency it was published in. The rates are
// deliberately coarse (checked July 2026) and the result is rounded to two
// significant figures, because an estimate that pretends to know the daily
// rate is invented precision. AED is pegged; the rest drift, and a drifted
// coarse rate still beats a figure that is wrong by three orders of magnitude.

const USD_TO: Record<string, number> = {
  USD: 1,
  GBP: 0.75,
  EUR: 0.88,
  NGN: 1380,
  CAD: 1.37,
  AUD: 1.5,
  NZD: 1.65,
  JPY: 162,
  CHF: 0.8,
  INR: 95,
  ZAR: 16.4,
  MXN: 18.5,
  BRL: 5.4,
  AED: 3.67,
};

function roundEstimate(n: number): number {
  if (n < 100) return Math.round(n);
  const mag = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.round(n / mag) * mag;
}

// An unmapped currency cannot occur through currencyForCountry, which only
// emits codes this table holds; the identity fallback keeps a stray input from
// crashing an estimate.
export function estimateInCurrency(usd: number, currency: string): number {
  const rate = USD_TO[currency.toUpperCase()] ?? 1;
  return roundEstimate(usd * rate);
}
