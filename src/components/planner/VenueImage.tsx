"use client";

import { useEffect, useState } from "react";
import { CategoryIcon } from "./CategoryIcon";
import { categoryImage, fetchVenuePhoto } from "@/lib/planner/venueImage";

// The image on a card. A warm tile with the category glyph always sits
// underneath, so a card is never a broken or grey box. The category image
// fades in over it when it loads. When the card is opened, the real photo
// provider is asked once, cached, and swapped in if it returns anything. Today
// that provider returns nothing, so the category image stands.

const photoCache = new Map<string, string | null>();

// A warm hue per category, kept in a narrow band so tiles feel like one set.
function warmHue(category: string): number {
  let h = 0;
  for (const c of category) h = (h * 31 + c.charCodeAt(0)) % 360;
  return 22 + (h % 26); // 22 to 47 degrees, amber to clay
}

export function VenueImage({
  category,
  venueName,
  active,
  className = "",
}: {
  category: string;
  venueName: string | null;
  active: boolean;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(categoryImage(category));
  const [loaded, setLoaded] = useState(false);

  // Lazy real photo lookup when the card is opened, cached across cards.
  useEffect(() => {
    if (!active) return;
    const key = `${category}|${venueName ?? ""}`;
    let cancelled = false;
    const apply = (url: string | null) => {
      if (cancelled || !url) return;
      setLoaded(false);
      setSrc(url);
    };

    if (photoCache.has(key)) {
      const raf = requestAnimationFrame(() => apply(photoCache.get(key) ?? null));
      return () => {
        cancelled = true;
        cancelAnimationFrame(raf);
      };
    }

    fetchVenuePhoto(category, venueName).then((url) => {
      photoCache.set(key, url);
      apply(url);
    });
    return () => {
      cancelled = true;
    };
  }, [active, category, venueName]);

  const hue = warmHue(category);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* the warm tile, always present */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          background: `linear-gradient(150deg, hsl(${hue} 46% 84%), hsl(${hue} 40% 73%))`,
          color: `hsl(${hue} 40% 38%)`,
        }}
      >
        <CategoryIcon category={category} className="h-8 w-8 opacity-80" />
      </div>

      {src && (
        // plain img so load and error are observable and the tile can win
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[var(--d3)] ease-[var(--ease)]"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
    </div>
  );
}
