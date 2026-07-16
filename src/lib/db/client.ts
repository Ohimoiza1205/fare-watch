import { createClient } from "@supabase/supabase-js";

// Browser client uses the anon key and is bound by row-level security, so a
// user only ever reaches their own rows.
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Service client uses the service role key, which bypasses row-level security.
// It is for trusted server code only, the cron poller above all. The key must
// never reach the browser, which is why it has no NEXT_PUBLIC prefix.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
