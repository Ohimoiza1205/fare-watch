import { latestObservationAt } from "@/lib/db/queries";
import { createServiceClient } from "@/lib/db/client";
import { pollCadenceMs } from "@/lib/cron";
import { KineticHeading } from "@/components/KineticHeading";
import { IconTile } from "@/components/IconTile";

// A read-only statement of how the system is configured, checked server-side
// at render. Presence of a key is stated, its value only ever masked. The
// detection figures restate src/lib/detect/signals.ts and
// src/lib/notify/dispatch.ts; change those files, not this page, and keep the
// copy in step.
export const dynamic = "force-dynamic";

function maskTopic(topic: string): string {
  return topic.length <= 3 ? "***" : `${topic.slice(0, 3)}***`;
}

function maskEmail(addr: string): string {
  const [user, domain] = addr.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 1)}***@${domain}`;
}

function maskPhone(phone: string): string {
  return phone.length <= 2 ? "***" : `***${phone.slice(-2)}`;
}

function Glyph({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function ConfiguredPill({ configured }: { configured: boolean }) {
  if (!configured) {
    return (
      <span
        className="rounded-full px-2.5 py-1 text-[10px] uppercase"
        style={{
          letterSpacing: "0.06em",
          border: "1px solid var(--hairline-strong)",
          color: "var(--ink-3)",
        }}
      >
        Not set
      </span>
    );
  }
  return (
    <span
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase"
      style={{
        letterSpacing: "0.06em",
        background: "var(--cool-soft)",
        color: "var(--cool)",
      }}
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3 w-3"
        aria-hidden="true"
      >
        <path
          d="M3 8.5l3.5 3.5L13 4.5"
          className="check-draw"
          style={{ ["--check-length" as string]: "18" }}
        />
      </svg>
      Configured
    </span>
  );
}

function Card({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="surface-2 elev-raise rounded-[var(--r-card)] p-5"
      style={{ border: "1px solid var(--hairline)" }}
    >
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">{title}</span>
        {aside}
      </div>
      {children}
    </section>
  );
}

function ThresholdRow({
  glyph,
  title,
  value,
  children,
}: {
  glyph: string;
  title: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-4 border-t py-3 first:border-t-0"
      style={{ borderColor: "var(--hairline)" }}
    >
      <IconTile tone="cool" size={32}>
        <Glyph d={glyph} />
      </IconTile>
      <div className="min-w-0 flex-1">
        <div className="text-sm" style={{ color: "var(--ink-1)" }}>
          {title}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>
          {children}
        </p>
      </div>
      <span className="num shrink-0 text-xl" style={{ color: "var(--ink-0)" }}>
        {value}
      </span>
    </div>
  );
}

function relativeAge(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "under a minute";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function pollView(lastPollAt: string | null, cadence: number | null) {
  const now = Date.now();
  const elapsed = lastPollAt != null ? now - new Date(lastPollAt).getTime() : null;
  const state: "active" | "overdue" | "unscheduled" =
    cadence == null
      ? "unscheduled"
      : elapsed != null && elapsed <= cadence * 2
        ? "active"
        : "overdue";
  const nextRunMs =
    cadence != null && lastPollAt != null
      ? new Date(lastPollAt).getTime() + cadence - now
      : null;
  return { elapsed, state, nextRunMs };
}

async function activeWatches(): Promise<number> {
  const db = createServiceClient();
  const { count } = await db
    .from("watch")
    .select("id", { count: "exact", head: true })
    .eq("active", true);
  return count ?? 0;
}

export default async function Settings() {
  const topic = process.env.NTFY_TOPIC ?? null;
  const emailKey = process.env.RESEND_API_KEY ?? null;
  const emailTo = process.env.RESEND_TO ?? null;
  const whatsapp = process.env.WHATSAPP_TOKEN ?? null;
  const whatsappTo = process.env.WHATSAPP_TO ?? null;

  const channels = [
    {
      name: "ntfy push",
      glyph: "M8 3h8v18H8zM11 19h2",
      configured: Boolean(topic),
      identifier: topic ? maskTopic(topic) : null,
    },
    {
      name: "Email",
      glyph: "M3 6h18v12H3zM3 7l9 6 9-6",
      configured: Boolean(emailKey),
      identifier: emailKey && emailTo ? maskEmail(emailTo) : null,
    },
    {
      name: "WhatsApp",
      glyph: "M21 12a9 9 0 0 1-13 8l-5 1 1.4-4.5A9 9 0 1 1 21 12z",
      configured: Boolean(whatsapp),
      identifier: whatsapp && whatsappTo ? maskPhone(whatsappTo) : null,
    },
  ];
  const configuredCount = channels.filter((c) => c.configured).length;

  const cadence = pollCadenceMs();
  let lastPollAt: string | null = null;
  let routes = 0;
  try {
    [lastPollAt, routes] = await Promise.all([latestObservationAt(), activeWatches()]);
  } catch {
    // the cards still render when the database is unreachable
  }

  const { elapsed, state, nextRunMs } = pollView(lastPollAt, cadence);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8 lg:px-10">
      <KineticHeading className="text-3xl">Settings</KineticHeading>

      <div className="mt-6 space-y-5">
        <Card
          title="Notification channels"
          aside={
            <span className="num text-xs" style={{ color: "var(--ink-3)" }}>
              {configuredCount} of 3 configured
            </span>
          }
        >
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {channels.map((c) => (
              <div
                key={c.name}
                className="surface-1 rounded-xl p-3.5"
                style={{ border: "1px solid var(--hairline)" }}
              >
                <div className="flex items-center justify-between">
                  <IconTile tone={c.configured ? "cool" : "neutral"} size={32}>
                    <Glyph d={c.glyph} />
                  </IconTile>
                  <ConfiguredPill configured={c.configured} />
                </div>
                <div className="mt-2.5 text-sm" style={{ color: "var(--ink-1)" }}>
                  {c.name}
                </div>
                {c.identifier && (
                  <div className="num mt-0.5 text-xs" style={{ color: "var(--ink-3)" }}>
                    {c.identifier}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Detection thresholds"
          aside={
            <span className="text-xs" style={{ color: "var(--ink-3)" }}>
              Applied to all watched routes
            </span>
          }
        >
          <div className="mt-3">
            <ThresholdRow
              glyph="M12 21c-3.9 0-7-2.9-7-6.5 0-2.8 1.7-4.6 3.2-6.3C9.6 6.6 11 5.1 11 3c3 1.5 8 5.5 8 11.5 0 3.6-3.1 6.5-7 6.5z"
              title="Mistake fare"
              value="55%"
            >
              Fires when the current fare is below 55% of the recorded floor,
              after at least 20 recorded prices.
            </ThresholdRow>
            <ThresholdRow
              glyph="M12 14v-3M7 20a8 8 0 1 1 10 0zM12 6v1"
              title="Threshold"
              value="set per watch"
            >
              Fires when the current fare is at or below the watch&apos;s own
              target price.
            </ThresholdRow>
            <ThresholdRow
              glyph="M19 5L5 19M7.5 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM16.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"
              title="Percentile"
              value="10th"
            >
              Fires when the current fare is at or below the 10th percentile of
              recorded prices, after at least 20 recorded prices.
            </ThresholdRow>
            <ThresholdRow
              glyph="M4 6l7 7 4-4 5 5M20 10v4h-4"
              title="Sudden drop"
              value="20%"
            >
              Fires when the current fare is 20% or more below the last reading.
            </ThresholdRow>
            <ThresholdRow
              glyph="M12 8v5l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z"
              title="Debounce"
              value="12h / 1h"
            >
              The same reason does not fire twice for a watch within 12 hours;
              mistake fares within 1 hour.
            </ThresholdRow>
          </div>
        </Card>

        <Card
          title="Polling status"
          aside={
            <span
              className="rounded-full px-2.5 py-1 text-[10px] uppercase"
              style={
                state === "active"
                  ? {
                      letterSpacing: "0.06em",
                      background: "var(--cool-soft)",
                      color: "var(--cool)",
                    }
                  : state === "overdue"
                    ? {
                        letterSpacing: "0.06em",
                        background: "var(--amber-soft)",
                        color: "var(--amber)",
                      }
                    : {
                        letterSpacing: "0.06em",
                        border: "1px solid var(--hairline-strong)",
                        color: "var(--ink-3)",
                      }
              }
            >
              {state === "active"
                ? "Active"
                : state === "overdue"
                  ? "Overdue"
                  : "Not scheduled"}
            </span>
          }
        >
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <span className="eyebrow">Cadence</span>
              <div className="num mt-1 text-sm" style={{ color: "var(--ink-1)" }}>
                {cadence != null ? `every ${Math.round(cadence / 3_600_000)}h` : "none"}
              </div>
            </div>
            <div>
              <span className="eyebrow">Routes active</span>
              <div className="num mt-1 text-sm" style={{ color: "var(--ink-1)" }}>
                {routes}
              </div>
            </div>
            <div>
              <span className="eyebrow">Last run</span>
              <div className="num mt-1 text-sm" style={{ color: "var(--ink-1)" }}>
                {elapsed != null ? `${relativeAge(elapsed)} ago` : "never"}
              </div>
            </div>
            {nextRunMs != null && (
              <div>
                <span className="eyebrow">Next run</span>
                <div className="num mt-1 text-sm" style={{ color: "var(--ink-1)" }}>
                  {nextRunMs > 0 ? `in ${relativeAge(nextRunMs)}` : "overdue"}
                </div>
              </div>
            )}
          </div>

          {cadence != null && (
            <div
              className="surface-3 mt-4 h-1 overflow-hidden rounded-full"
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${elapsed != null ? Math.min(100, (elapsed / cadence) * 100) : 100}%`,
                  background: state === "overdue" ? "var(--amber)" : "var(--cool)",
                }}
              />
            </div>
          )}
        </Card>
      </div>

      <p className="mt-6 text-sm" style={{ color: "var(--ink-3)" }}>
        Values change in code and environment, not here.
      </p>
    </main>
  );
}
