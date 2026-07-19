import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { MagneticButton } from "@/components/MagneticButton";

export const metadata: Metadata = {
  title: "Farepoint. Know what your next trip costs before you book it.",
  description:
    "A personal flight price tracker and trip planner. Real fares, real venues, honest budgets.",
};

// The pre-app landing page per REBRAND-SPEC Part 4. Anonymous visitors land
// here; middleware sends returning sessions straight to /app. Every image is
// a real screenshot of the current build and every sentence is literally
// true of it. No invented stats, no mascots, no AI iconography.

function PlaneGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 4L3 11l7 2.5L12.5 21l3-6.5L21 4z" />
    </svg>
  );
}

const STEPS = [
  {
    title: "Watch a route",
    body: "Pick an origin, a destination, and dates. Farepoint polls real fares and stores every price it sees.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
  },
  {
    title: "Get alerted",
    body: "The moment a watched fare is genuinely cheap against its own history, an alert reaches your phone with the price and the reason.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0" />
      </svg>
    ),
  },
  {
    title: "Plan the trip",
    body: "Generate a day by day itinerary with real venues, real weather, and a budget you can hold before you commit.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M4 7h16v12H4zM4 7l3-3h10l3 3M9 11h6" />
      </svg>
    ),
  },
];

const PROOF = [
  {
    src: "/landing/proof-best-deal.png",
    width: 1061,
    height: 396,
    alt: "The best deal card on the Farepoint home page in its empty state",
    text: "The best deal card stays empty until a watched fare truly drops; it never invents a deal.",
  },
  {
    src: "/landing/proof-deal-card.png",
    width: 795,
    height: 447,
    alt: "A live deal card showing a London to Lubbock fare at GBP 991",
    text: "Each catch shows the live price, the rule that fired, and a direct booking link.",
  },
  {
    src: "/landing/proof-donut.png",
    width: 479,
    height: 887,
    alt: "A trip budget donut summing a Lagos itinerary by category",
    text: "A trip budget summed from real venue prices, estimates marked and never disguised.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "var(--cool-soft)", color: "var(--cool)" }}
          >
            <PlaneGlyph className="h-4 w-4" />
          </span>
          <span
            className="heading text-sm tracking-wide"
            style={{ color: "var(--ink-0)", letterSpacing: "0.06em" }}
          >
            FAREPOINT
          </span>
        </span>
        <nav className="flex items-center gap-5">
          <Link
            href="/about"
            className="pressable text-xs"
            style={{ color: "var(--ink-3)" }}
          >
            For investors
          </Link>
          <MagneticButton
            href="/app"
            className="glass rounded-full px-5 py-2 text-sm"
            style={{ color: "var(--ink-0)" }}
          >
            Try now
          </MagneticButton>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="pb-16 pt-14 text-center">
          <h1
            className="heading mx-auto max-w-3xl text-4xl leading-tight md:text-5xl"
            style={{ color: "var(--ink-0)" }}
          >
            Know what your next trip costs before you book it.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base" style={{ color: "var(--ink-2)" }}>
            Farepoint watches real fares on routes you choose and alerts you when a
            price drops below its own history. Then it plans the trip day by day
            with real venues and honest prices.
          </p>
          <div className="mt-8 flex justify-center">
            <MagneticButton
              href="/app"
              className="glass rounded-full px-8 py-3.5 text-base"
              style={{ color: "var(--ink-0)" }}
            >
              Try now
            </MagneticButton>
          </div>
          <div className="mt-14 flex justify-center">
            <div
              className="glass elev-float rounded-2xl p-2"
              style={{ transform: "perspective(1400px) rotateX(3deg) rotateY(-2deg)" }}
            >
              <Image
                src="/landing/hero-itinerary.jpg"
                width={1568}
                height={773}
                alt="The Farepoint trip itinerary page showing a 14 day Lagos trip with real venues and a live budget"
                className="max-w-full rounded-xl"
                priority
              />
            </div>
          </div>
        </section>

        <section className="border-t py-16" style={{ borderColor: "var(--hairline)" }}>
          <div className="grid gap-10 md:grid-cols-3">
            {PROOF.map((p) => (
              <figure key={p.src} className="flex flex-col gap-4">
                <div className="glass flex flex-1 items-center justify-center rounded-xl p-3">
                  <Image
                    src={p.src}
                    width={p.width}
                    height={p.height}
                    alt={p.alt}
                    className="max-h-72 w-auto max-w-full rounded-lg"
                  />
                </div>
                <figcaption className="text-sm" style={{ color: "var(--ink-2)" }}>
                  {p.text}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="border-t py-16" style={{ borderColor: "var(--hairline)" }}>
          <div className="grid gap-10 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title}>
                <span
                  className="glass flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ color: "var(--cool)" }}
                >
                  {s.icon}
                </span>
                <h2 className="heading mt-4 text-lg" style={{ color: "var(--ink-0)" }}>
                  <span className="num mr-2 text-sm" style={{ color: "var(--ink-3)" }}>
                    {i + 1}
                  </span>
                  {s.title}
                </h2>
                <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          className="border-t py-20 text-center"
          style={{ borderColor: "var(--hairline)" }}
        >
          <p className="heading text-2xl" style={{ color: "var(--ink-0)" }}>
            Know what your next trip costs before you book it.
          </p>
          <div className="mt-6 flex justify-center">
            <MagneticButton
              href="/app"
              className="glass rounded-full px-8 py-3.5 text-base"
              style={{ color: "var(--ink-0)" }}
            >
              Try now
            </MagneticButton>
          </div>
          <p className="mt-10 pb-4 text-xs" style={{ color: "var(--ink-3)" }}>
            <Link href="/about" className="pressable underline underline-offset-2">
              For investors
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
