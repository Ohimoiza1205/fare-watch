// What the traveller gives the planner, and the small amount of normalising the
// generator needs before it can arrange. A trip is defined by a calm intake, so
// the fields are few and either dates or a length plus a rough month is enough.

export type Pace = "relaxed" | "balanced" | "packed";
export type TasteTag =
  | "foodie"
  | "outdoors"
  | "nightlife"
  | "culture"
  | "cheap"
  | "treat";

export const TASTE_TAGS: TasteTag[] = [
  "foodie",
  "outdoors",
  "nightlife",
  "culture",
  "cheap",
  "treat",
];

export type TripIntake = {
  origin: string;
  destination: string;
  startDate?: string | null; // yyyy-mm-dd
  endDate?: string | null; // yyyy-mm-dd
  lengthDays?: number | null;
  roughMonth?: string | null; // yyyy-mm
  travellers: number;
  budgetCeiling?: number | null;
  pace: Pace;
  taste: TasteTag[];
};

export type ResolvedIntake = TripIntake & {
  startDate: string;
  endDate: string;
  lengthDays: number;
};

// A user-facing error the intake or generation can raise, so the API can return
// a plain message rather than a stack trace.
export class PlannerError extends Error {}

const MAX_TRIP_DAYS = 30;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

// Date only maths anchored at noon so a day never slips across a boundary.
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysInclusive(startIso: string, endIso: string): number {
  const a = new Date(`${startIso}T12:00:00`).getTime();
  const b = new Date(`${endIso}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000) + 1;
}

export function enumerateDates(startIso: string, lengthDays: number): string[] {
  return Array.from({ length: lengthDays }, (_, i) => addDaysIso(startIso, i));
}

// Resolve the intake to concrete dates and a length, from whichever of the two
// forms the traveller gave. Everything downstream works in resolved dates.
export function resolveIntake(intake: TripIntake): ResolvedIntake {
  if (!intake.destination.trim()) {
    throw new PlannerError("A destination is needed.");
  }
  if (!Number.isFinite(intake.travellers) || intake.travellers < 1) {
    throw new PlannerError("At least one traveller is needed.");
  }

  let startDate = intake.startDate || null;
  let endDate = intake.endDate || null;
  let lengthDays = intake.lengthDays ?? null;

  if (startDate && endDate) {
    lengthDays = daysInclusive(startDate, endDate);
  } else if (startDate && lengthDays) {
    endDate = addDaysIso(startDate, lengthDays - 1);
  } else if (lengthDays && intake.roughMonth) {
    // A rough month starts the trip a little inside the month, away from edges.
    startDate = `${intake.roughMonth}-08`;
    endDate = addDaysIso(startDate, lengthDays - 1);
  } else {
    throw new PlannerError("Give dates, or a length and a month.");
  }

  if (lengthDays < 1) throw new PlannerError("A trip is at least one day.");
  lengthDays = clamp(lengthDays, 1, MAX_TRIP_DAYS);
  endDate = addDaysIso(startDate, lengthDays - 1);

  return { ...intake, startDate, endDate, lengthDays };
}
