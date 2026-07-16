import { ActivityProvider, ActivityQuery, PricedActivity } from "./types";
import { fetchEventsByDate } from "../events";

// The single-day activity provider used for one-off lookups and swaps. It reuses
// the shared events fetch for a one day window and returns the first priced
// event as a confirmed activity, scaled to the party. Generation uses the range
// fetch directly rather than this per-day wrapper.

export const ticketmaster: ActivityProvider = {
  name: "ticketmaster",
  async find(q: ActivityQuery): Promise<PricedActivity | null> {
    const byDate = await fetchEventsByDate({
      lat: q.lat,
      lon: q.lon,
      startDate: q.date,
      endDate: q.date,
      currency: q.currency,
    });
    const event = byDate.get(q.date)?.[0];
    if (!event) return null;

    return {
      category: event.category,
      title: event.title,
      venue: event.venue,
      address: event.address,
      priceParty: event.perMin * q.travellers,
      pricePartyMax: event.perMax * q.travellers,
      currency: event.currency,
      isEstimated: false,
      priceSource: "ticketmaster",
      sourceUrl: event.url,
      note: null,
    };
  },
};
