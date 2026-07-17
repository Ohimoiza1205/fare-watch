"use client";

import { useState } from "react";
import type { ComposedItem } from "@/lib/planner/day";
import { formatMoney } from "@/lib/planner/format";
import { PriceTag } from "./PriceTag";
import { VenueImage } from "./VenueImage";

// An activity as an image led card. The image sits at the top, then the
// category, the venue, and the price. A confirmed price and a marked estimate
// stay apart through form, the bright figure against the dim tilde and est tag,
// never through the status accent. The card lifts on hover and opens to its
// detail on click, which is also when the real photo is asked for.

export function VenueCard({
  item,
  travellers,
}: {
  item: ComposedItem;
  travellers: number;
}) {
  const [open, setOpen] = useState(false);

  const title = item.venue ?? item.title;
  const secondary =
    !item.isEstimated && item.title && item.title !== item.venue
      ? item.title
      : null;

  const perTraveller =
    item.price != null && travellers > 0 ? item.price / travellers : null;
  const basis = item.isEstimated
    ? item.note ?? "Estimated, typical local range for the party."
    : `Confirmed price via ${item.priceSource ?? "a real source"}.`;

  return (
    <div className="surface-2 rounded-xl shadow-[var(--elev-raise)] transition-[transform,box-shadow] duration-[var(--d1)] ease-[var(--ease)] hover:-translate-y-1 hover:shadow-[var(--elev-float)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="block w-full overflow-hidden rounded-xl text-left"
      >
        <VenueImage
          category={item.category}
          venueName={item.venue}
          active={open}
          className="aspect-[16/10] w-full"
        />

        <div className="p-3.5">
          <div className="eyebrow">{item.category}</div>
          <div className="mt-1 truncate text-sm ink-1">{title}</div>
          {secondary && (
            <div className="truncate text-xs ink-3">{secondary}</div>
          )}
          <div className="mt-2.5">
            <PriceTag
              price={item.price}
              priceMax={item.priceMax}
              currency={item.currency}
              isEstimated={item.isEstimated}
              className="text-base"
            />
          </div>
        </div>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-[var(--d2)] ease-[var(--ease)] ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className="mx-3.5 border-t py-3 text-xs leading-relaxed ink-3"
            style={{ borderColor: "var(--hairline)" }}
          >
            {item.address && <div className="ink-2">{item.address}</div>}
            <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span>{basis}</span>
              {perTraveller != null && (
                <span className="num">
                  {formatMoney(perTraveller, item.currency)} per traveller
                </span>
              )}
            </div>
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-block ink-2 underline decoration-[var(--hairline-strong)] underline-offset-2 transition-colors hover:text-[var(--ink-0)]"
              >
                {item.isEstimated ? "View place" : "Open booking"}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
