import { unstable_cache } from "next/cache";
import { Sidebar, type SidebarWeather } from "@/components/Sidebar";
import { ThemeScope } from "@/components/ThemeScope";
import { createServiceClient } from "@/lib/db/client";
import { nextUpcomingTrip } from "@/lib/planner/repo";
import { fetchWeather } from "@/lib/planner/weather";

// The weather lookup is cached for an hour per location and day so Open-Meteo
// is not hit on every render. The trip read itself stays fresh.
const cachedWeather = unstable_cache(
  (lat: number, lon: number, date: string) => fetchWeather({ lat, lon, date }),
  ["sidebar-weather"],
  { revalidate: 3600 }
);

// Today's weather at the next trip's destination. Null, and no card, when
// there is no upcoming trip, no coordinates, or no snapshot.
async function sidebarWeather(): Promise<SidebarWeather | null> {
  try {
    const trip = await nextUpcomingTrip(createServiceClient());
    if (!trip || trip.destLat == null || trip.destLon == null) return null;

    const today = new Date().toLocaleDateString("en-CA");
    const snapshot = await cachedWeather(trip.destLat, trip.destLon, today);
    if (!snapshot) return null;

    return { destLabel: trip.destLabel ?? trip.destination, snapshot };
  } catch {
    return null;
  }
}

// The left rail navigates both views. The theme scope gives the planner its blue
// surface and the tracker its dark one, switching by route.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const weather = await sidebarWeather();

  return (
    <ThemeScope>
      <div className="flex min-h-screen">
        <Sidebar weather={weather} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </ThemeScope>
  );
}
