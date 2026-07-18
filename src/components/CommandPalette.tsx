"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { label: string; href: string };
type Group = { label: string; items: Item[] };

const BASE_GROUPS: Group[] = [
  {
    label: "TRACKER",
    items: [
      { label: "Home", href: "/" },
      { label: "Deals", href: "/deals" },
      { label: "Watchlist", href: "/watchlist" },
      { label: "Alerts", href: "/alerts" },
    ],
  },
  {
    label: "PLANNER",
    items: [{ label: "Plan a trip", href: "/plan" }],
  },
  {
    label: "ACCOUNT",
    items: [
      { label: "Profile", href: "/profile" },
      { label: "Settings", href: "/settings" },
    ],
  },
  {
    label: "ACTIONS",
    items: [
      { label: "Add watch", href: "/watchlist#add" },
      { label: "Plan a trip", href: "/plan" },
    ],
  },
];

// Case-insensitive subsequence match, the standard fuzzy-filter shape for a
// command palette: every character of the query must appear in the label, in
// order, with gaps allowed.
function subsequenceMatch(label: string, query: string): boolean {
  if (!query) return true;
  const l = label.toLowerCase();
  const q = query.toLowerCase();
  let li = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    li = l.indexOf(ch, li);
    if (li === -1) return false;
    li++;
  }
  return true;
}

export function CommandPalette({ tripLink }: { tripLink?: { label: string; href: string } | null }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const router = useRouter();

  function close() {
    setOpen(false);
    setQuery("");
    setHighlight(0);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (v) {
            setQuery("");
            setHighlight(0);
          }
          return !v;
        });
        return;
      }
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const groups = useMemo(() => {
    const withTrip = BASE_GROUPS.map((g) => {
      if (g.label !== "PLANNER" || !tripLink) return g;
      return { ...g, items: [...g.items, tripLink] };
    });
    return withTrip
      .map((g) => ({ ...g, items: g.items.filter((it) => subsequenceMatch(it.label, query)) }))
      .filter((g) => g.items.length > 0);
  }, [query, tripLink]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  function onQueryChange(next: string) {
    setQuery(next);
    setHighlight(0);
  }

  function go(href: string) {
    router.push(href);
    close();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
        onClick={close}
      />
      <div
        className="glass absolute left-1/2 -translate-x-1/2 w-full max-w-[560px] overflow-hidden"
        style={{ top: "20vh", borderRadius: "var(--r-card)", boxShadow: "var(--elev-float)" }}
        role="dialog"
        aria-modal="true"
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => (flat.length ? (h + 1) % flat.length : 0));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => (flat.length ? (h - 1 + flat.length) % flat.length : 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const item = flat[highlight];
              if (item) go(item.href);
            }
          }}
          placeholder="Go to or run"
          className="w-full bg-transparent px-4 py-3 text-sm outline-none"
          style={{ color: "var(--ink-0)", borderBottom: "1px solid var(--hairline)" }}
        />

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {flat.length === 0 && (
            <div className="px-4 py-6 text-sm" style={{ color: "var(--ink-3)" }}>
              No matches.
            </div>
          )}
          {groups.map((group) => (
            <div key={group.label} className="px-2 py-1">
              <div
                className="px-2 pt-2 pb-1 text-[10px]"
                style={{ letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase" }}
              >
                {group.label}
              </div>
              {group.items.map((item) => {
                const index = flat.indexOf(item);
                const active = index === highlight;
                return (
                  <button
                    key={`${group.label}-${item.href}-${item.label}`}
                    type="button"
                    onClick={() => go(item.href)}
                    onMouseEnter={() => setHighlight(index)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left"
                    style={{
                      background: active ? "var(--cool-soft)" : "transparent",
                      borderLeft: active ? "2px solid var(--cool)" : "2px solid transparent",
                    }}
                  >
                    <span style={{ color: active ? "var(--ink-0)" : "var(--ink-1)" }}>{item.label}</span>
                    <span className="num text-[11px]" style={{ color: "var(--ink-4)" }}>
                      {item.href}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
