import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Farepoint project status",
  description: "What Farepoint is, what is real today, and what is next.",
};

// The investor page per REBRAND-SPEC Part 5: one quiet page of plain prose.
// Every claim here must stay literally true of the current build; when the
// build changes, this page changes with it.

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="eyebrow">Project status</p>
      <h1 className="heading mt-2 text-3xl" style={{ color: "var(--ink-0)" }}>
        Farepoint, plainly
      </h1>

      <div className="mt-8 space-y-6 text-[15px] leading-7" style={{ color: "var(--ink-1)" }}>
        <p>
          Farepoint is a personal flight price tracker and trip planner built as
          one product. It watches fares on chosen routes, stores every price it
          sees, and raises an alert when a fare drops below that route&apos;s own
          history. Around a route it can generate a day by day trip plan with
          real venues and an honest budget.
        </p>
        <p>
          What is real today: the tracker polls live fares through a flight
          search API and has caught real drops on watched routes, including a
          London to Lubbock fare at GBP 991 against a GBP 1,100 target, alerted
          to a phone within the same poll. Detection is arithmetic on stored
          history, nothing more: a manual threshold, a tenth percentile test, a
          sudden drop test, and a mistake fare test. The planner generates day
          by day itineraries from real venue lookups, prices each item from a
          real figure where one exists and a clearly marked estimate where one
          does not, reads real weather, and keeps a live budget summed from the
          items. The assistant answers only from stored data and refuses to
          state a price that did not come from a tool result.
        </p>
        <p>
          What is next: production deployment, sign in beyond the single local
          account, more watched corridors as API limits allow, and real
          destination photography. The stack is Next.js, Supabase, and a small
          set of free data sources; the fare API budget is fifty requests a
          month, which shapes how often the tracker polls.
        </p>
        <p>
          Farepoint is one person&apos;s project, built and run for real use.
          There is no company, no revenue, and no user count to report; this
          page exists so anyone curious can see exactly what stands.
        </p>
      </div>

      <p className="mt-12 text-sm">
        <Link
          href="/"
          className="pressable underline underline-offset-2"
          style={{ color: "var(--ink-2)" }}
        >
          Back to the front page
        </Link>
      </p>
    </div>
  );
}
