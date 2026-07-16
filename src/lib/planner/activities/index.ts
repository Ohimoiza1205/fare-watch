import { ActivityProvider, ActivityQuery, PricedActivity } from "./types";
import { ticketmaster } from "./ticketmaster";
import { osmVenue } from "./osmVenue";

// Order matters. Ticketmaster gives a confirmed price, so it is tried first.
// osmVenue gives a real venue with a marked estimate, so it is the honest floor
// that keeps a day from being empty. A source that throws is logged and skipped,
// never silently swallowed.
export function activityProviders(): ActivityProvider[] {
  return [ticketmaster, osmVenue];
}

export async function findOneActivity(
  q: ActivityQuery
): Promise<PricedActivity | null> {
  for (const p of activityProviders()) {
    try {
      const result = await p.find(q);
      if (result) return result;
    } catch (e) {
      console.error(`activity provider ${p.name} failed`, e);
    }
  }
  return null;
}
