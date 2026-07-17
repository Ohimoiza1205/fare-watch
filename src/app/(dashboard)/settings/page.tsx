// A read-only statement of how the system is configured, checked server-side
// at render. Presence of a key is stated, its value never is. The detection
// figures restate src/lib/detect/signals.ts and src/lib/notify/dispatch.ts;
// change those files, not this page, and keep the copy in step.
export const dynamic = "force-dynamic";

function N({ children }: { children: React.ReactNode }) {
  return <span className="num ink-1">{children}</span>;
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div
      className="grid grid-cols-[8.5rem_1fr] items-baseline gap-x-6 border-t py-3"
      style={{ borderColor: "var(--hairline)" }}
    >
      <span className="text-xs ink-2">{term}</span>
      <span className="text-sm leading-relaxed ink-3">{children}</span>
    </div>
  );
}

export default function Settings() {
  const channels = [
    { name: "ntfy push", configured: Boolean(process.env.NTFY_TOPIC) },
    { name: "Email", configured: Boolean(process.env.RESEND_API_KEY) },
    { name: "WhatsApp", configured: Boolean(process.env.WHATSAPP_TOKEN) },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-8 py-10">
      <h1 className="text-lg ink-0">Settings</h1>

      <section className="mt-10">
        <h2 className="eyebrow">Notification channels</h2>
        <div className="mt-3">
          {channels.map((c) => (
            <Row key={c.name} term={c.name}>
              {c.configured ? (
                <span className="ink-1">configured</span>
              ) : (
                "not configured"
              )}
            </Row>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="eyebrow">Detection thresholds</h2>
        <div className="mt-3">
          <Row term="mistake">
            Fires when the current fare is below <N>55%</N> of the recorded
            floor, after at least <N>20</N> recorded prices.
          </Row>
          <Row term="threshold">
            Fires when the current fare is at or below the watch&apos;s own
            target price.
          </Row>
          <Row term="percentile">
            Fires when the current fare is at or below the <N>10th</N>{" "}
            percentile of recorded prices, after at least <N>20</N> recorded
            prices.
          </Row>
          <Row term="drop">
            Fires when the current fare is <N>20%</N> or more below the last
            reading.
          </Row>
          <Row term="debounce">
            The same reason does not fire twice for a watch within{" "}
            <N>12 hours</N>; mistake fares within <N>1 hour</N>.
          </Row>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="eyebrow">Polling</h2>
        <div className="mt-3">
          <Row term="cron">Cron not scheduled yet.</Row>
        </div>
      </section>

      <p className="mt-12 text-sm ink-3">
        Values change in code and environment, not here.
      </p>
    </main>
  );
}
