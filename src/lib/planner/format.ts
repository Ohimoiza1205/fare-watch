// Money is displayed the tracker's way: the currency code set plainly beside the
// figure, grouped with en-GB separators, in tabular figures at the call site. A
// price without its currency means nothing across GBP, USD, and NGN.

export function formatMoney(n: number, currency: string): string {
  return `${currency} ${Math.round(n).toLocaleString("en-GB")}`;
}

// A range collapses to a single figure when the two ends round to the same
// number, so a fixed price never reads as a spurious range.
export function formatMoneyRange(lo: number, hi: number, currency: string): string {
  const a = Math.round(lo);
  const b = Math.round(hi);
  if (a === b) return formatMoney(a, currency);
  return `${currency} ${a.toLocaleString("en-GB")} to ${b.toLocaleString("en-GB")}`;
}

export function formatTemp(n: number | null, unit: "C" | "F"): string {
  if (n == null) return "--";
  return `${Math.round(n)} ${unit}`;
}

// A date only string rendered without pulling the local timezone across a day
// boundary. Noon anchors it inside the intended calendar day everywhere.
export function formatDayDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}
