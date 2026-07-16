import { createServiceClient } from "@/lib/db/client";
import { resolveIntake, enumerateDates, PlannerError } from "./intake";
import type { TripIntake } from "./intake";
import { geocode } from "./geocode";
import { currencyForCountry } from "./currency";
import { discoverVenues } from "./discover";
import { fetchEventsByDate } from "./events";
import { fetchWeatherRange } from "./weather";
import { arrangeTrip } from "./arrange";
import {
  resolveOwnerUserId,
  insertTrip,
  insertDaysAndItems,
} from "./repo";

// The spine of generation. Resolve the intake, resolve the destination, gather
// the real data in a small fixed number of calls, arrange the days, and persist.
// Intelligence arranges; every price comes from a real event or a marked
// estimate. Failures in a single lookup degrade to less data, never to invented
// data.

export async function generateTrip(intake: TripIntake): Promise<{ id: string }> {
  const resolved = resolveIntake(intake);

  const geo = await geocode(resolved.destination);
  if (!geo) {
    throw new PlannerError(`Could not find "${resolved.destination}".`);
  }

  const currency = currencyForCountry(geo.countryCode);
  const dates = enumerateDates(resolved.startDate, resolved.lengthDays);

  // Three sources, gathered together: real venues by category, real priced
  // events by date, real weather by date. Each is capped or windowed to stay
  // light on its free tier.
  const [venuesByCategory, eventsByDate, weatherByDate] = await Promise.all([
    discoverVenues(geo.lat, geo.lon),
    fetchEventsByDate({
      lat: geo.lat,
      lon: geo.lon,
      startDate: resolved.startDate,
      endDate: resolved.endDate,
      currency,
    }),
    fetchWeatherRange({ lat: geo.lat, lon: geo.lon, dates }),
  ]);

  const planned = arrangeTrip({
    startDate: resolved.startDate,
    lengthDays: resolved.lengthDays,
    pace: resolved.pace,
    taste: resolved.taste,
    travellers: resolved.travellers,
    currency,
    venuesByCategory,
    eventsByDate,
    weatherByDate,
  });

  const db = createServiceClient();
  const userId = resolveOwnerUserId();
  const trip = await insertTrip(db, { userId, intake: resolved, geo, currency });
  await insertDaysAndItems(db, trip.id, planned, weatherByDate);

  return { id: trip.id };
}
