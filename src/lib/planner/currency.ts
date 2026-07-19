// The trip's currency follows its destination country, so a price is always
// shown in the money the traveller will actually spend. Covers the corridors
// Farepoint tracks and the common cases; anything unmapped falls back to USD.

const BY_COUNTRY: Record<string, string> = {
  US: "USD",
  GB: "GBP",
  NG: "NGN",
  CA: "CAD",
  AU: "AUD",
  NZ: "NZD",
  JP: "JPY",
  CH: "CHF",
  IN: "INR",
  ZA: "ZAR",
  MX: "MXN",
  BR: "BRL",
  AE: "AED",
  // euro area, the members a trip is likely to land in
  IE: "EUR",
  FR: "EUR",
  DE: "EUR",
  ES: "EUR",
  IT: "EUR",
  PT: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  GR: "EUR",
};

export function currencyForCountry(code: string | null | undefined): string {
  if (!code) return "USD";
  return BY_COUNTRY[code.toUpperCase()] ?? "USD";
}
