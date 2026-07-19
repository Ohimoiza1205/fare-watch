// The RapidAPI free plan's hard monthly cap. One place, importable from both
// server and client code (cron.ts cannot be, it reads vercel.json off disk),
// so the sidebar and Settings state the same ceiling the poller is sized
// against.
export const MONTHLY_REQUEST_CAP = 50;
