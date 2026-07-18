import { unstable_cache } from "next/cache";
import { Sidebar, type SidebarWeather } from "@/components/Sidebar";
import { ThemeScope } from "@/components/ThemeScope";
import { CommandPalette } from "@/components/CommandPalette";
import { createServiceClient } from "@/lib/db/client";
import { latestObservationAt } from "@/lib/db/queries";
import { pollCadenceMs } from "@/lib/cron";
import { mostRecentTrip, nextUpcomingTrip, type NextTrip } from "@/lib/planner/repo";
import { fetchWeather } from "@/lib/planner/weather";

// The weather lookup is cached for an hour per location and day so Open-Meteo
// is not hit on every render. The trip read itself stays fresh.
const cachedWeather = unstable_cache(
  (lat: number, lon: number, date: string) => fetchWeather({ lat, lon, date }),
  ["sidebar-weather"],
  { revalidate: 3600 }
);

// The next upcoming trip, or the most recent one when nothing is ahead. Feeds
// both the sidebar's dynamic trip link and the weather card.
async function sidebarTrip(): Promise<NextTrip | null> {
  try {
    const db = createServiceClient();
    return (await nextUpcomingTrip(db)) ?? (await mostRecentTrip(db));
  } catch {
    return null;
  }
}

async function sidebarWeather(trip: NextTrip | null): Promise<SidebarWeather | null> {
  try {
    if (!trip || trip.destLat == null || trip.destLon == null) return null;
    const today = new Date().toLocaleDateString("en-CA");
    const snapshot = await cachedWeather(trip.destLat, trip.destLon, today);
    if (!snapshot) return null;
    return { destLabel: trip.destLabel ?? trip.destination, snapshot };
  } catch {
    return null;
  }
}

async function lastPoll(): Promise<string | null> {
  try {
    return await latestObservationAt();
  } catch {
    return null;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const trip = await sidebarTrip();
  const weather = await sidebarWeather(trip);
  const lastPollAt = await lastPoll();
  const cadenceMs = pollCadenceMs();

  const city = trip ? (trip.destLabel ?? trip.destination).split(",")[0].trim() : null;
  const tripLink = trip && city ? { label: `${city} itinerary`, href: `/plan/${trip.id}` } : null;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        weather={weather}
        lastPollAt={lastPollAt}
        cadenceMs={cadenceMs}
        tripLink={tripLink}
      />
      <ThemeScope>{children}</ThemeScope>
      <CommandPalette tripLink={tripLink} />
    </div>
  );
}
