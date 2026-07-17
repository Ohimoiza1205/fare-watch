import { createServiceClient } from "@/lib/db/client";

// There is no auth yet, so this page states that fact and nothing more. The
// default currency is inferred from the watches because it is the only
// account-shaped fact the data actually holds.
export const dynamic = "force-dynamic";

async function defaultCurrency(): Promise<string | null> {
  const db = createServiceClient();
  const { data } = await db.from("watch").select("currency");
  const rows = (data ?? []) as { currency: string }[];
  if (!rows.length) return null;

  const counts = new Map<string, number>();
  for (const r of rows) {
    counts.set(r.currency, (counts.get(r.currency) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export default async function Profile() {
  const currency = await defaultCurrency();

  return (
    <main className="mx-auto w-full max-w-4xl px-8 py-10">
      <h1 className="text-lg ink-0">Profile</h1>

      <div className="mt-8 max-w-md rounded-xl p-5 surface-1">
        <p className="text-sm ink-1">Local account.</p>
        <p className="mt-2 text-sm leading-relaxed ink-3">
          Sign-in is not built yet; all data belongs to this installation.
        </p>
        {currency && (
          <p className="mt-4 text-sm ink-3">
            Default currency <span className="num ink-1">{currency}</span>
          </p>
        )}
      </div>
    </main>
  );
}
