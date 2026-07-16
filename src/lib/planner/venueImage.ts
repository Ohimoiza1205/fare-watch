// The single place a venue image is chosen. Today it returns a warm image for
// the activity category, from a free set. Later, a real photo provider (for
// example Google Places) slots in behind fetchVenuePhoto, keyed by the venue
// name, cached, and falling back to the category image. The cards never touch
// the provider directly, so the upgrade is one file.

// A free, warm image per category. These are the fallback set that every card
// can always show. Where a category has none, the card draws a warm tile.
const CATEGORY_IMAGE: Record<string, string> = {
  dining:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=70",
  cafe:
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=70",
  cinema:
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=70",
  bowling:
    "https://images.unsplash.com/photo-1538511011-6d5a1b0b3b2b?auto=format&fit=crop&w=800&q=70",
  golf:
    "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=800&q=70",
  museum:
    "https://images.unsplash.com/photo-1554907984-15263bfd63bd?auto=format&fit=crop&w=800&q=70",
  arcade:
    "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=800&q=70",
  nightlife:
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=70",
  shopping:
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=70",
  market:
    "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=800&q=70",
  outdoors:
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=70",
  groceries:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=70",
  pharmacy:
    "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=70",
  laundry:
    "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=70",
  concert:
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=70",
  theatre:
    "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=800&q=70",
  sports:
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=70",
  event:
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=70",
};

export type VenueImageChoice = {
  url: string | null; // the best image known now, or null to draw the tile
  category: string;
};

export function categoryImage(category: string): string | null {
  return CATEGORY_IMAGE[category] ?? null;
}

export function venueImage(
  category: string,
  venueName?: string | null
): VenueImageChoice {
  void venueName; // reserved for the real photo provider
  return { url: categoryImage(category), category };
}

// The seam. A real photo provider returns a venue specific photo url here,
// lazily when a card is opened, and the result is cached by the caller. Not
// enabled now, so it returns null and the category image stands in.
export async function fetchVenuePhoto(
  category: string,
  venueName: string | null
): Promise<string | null> {
  void category; // the real provider will query by category and venue name
  void venueName;
  return null;
}
