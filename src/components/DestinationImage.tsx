"use client";

import { useEffect, useState } from "react";
import { categoryPlaceholderStyle } from "@/lib/planner/categoryColor";
import { fetchDestinationPhoto } from "@/lib/planner/venueImage";

// A destination photo header that can never be a broken box. The warm tile
// with a line glyph always renders underneath; when the photo seam returns a
// real url the image fades in over it on the fade exception duration.
export function DestinationImage({
  place,
  className,
}: {
  place: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchDestinationPhoto(place).then((u) => {
      if (!cancelled && u) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [place]);

  const tile = categoryPlaceholderStyle(place);

  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{ background: tile.background }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke={tile.color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2"
      >
        <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: loaded ? 1 : 0,
            transition: "opacity var(--d-fade) var(--ease)",
          }}
        />
      )}
    </div>
  );
}
