# Deploying Farepoint

Owner-only steps, in order. The agent prepares; you deploy.

## 1. Push the branch and merge

```bash
git push -u origin overnight/jul-17
```

Review the branch on GitHub, merge to main when satisfied. If the push asks
for sign-in, run it once interactively.

## 2. Connect Vercel

1. vercel.com, Add New Project, import the GitHub repo. Framework is detected
   as Next.js; keep the defaults.
2. Do not deploy yet; add the environment first.

## 3. Environment variables

Copy every name from `.env.example` into Vercel Project Settings,
Environment Variables, with production values:

- The three Supabase values from the Supabase dashboard (service role key is
  server-only; it must never be prefixed NEXT_PUBLIC).
- A fresh RAPIDAPI_KEY. The key used during early runs was exposed in chat;
  regenerate it in the RapidAPI dashboard first and use the new one here and
  locally.
- A production CRON_SECRET, newly generated: `openssl rand -hex 32`. Do not
  reuse the local one.
- NTFY_TOPIC for push, RESEND values for email, WHATSAPP values when that
  channel is set up. Missing channels degrade honestly in Settings.
- ANTHROPIC_API_KEY to bring the assistant online; ANTHROPIC_MODEL optional
  (defaults to claude-haiku-4-5).

## 4. Deploy and verify

1. Deploy. Vercel reads `vercel.json` and schedules the poll cron at 06:00
   every second day, sized for two watches under the 50 request monthly cap.
   Widen only after upgrading the RapidAPI plan.
2. In Supabase Auth settings, add the Vercel domain to the allowed redirect
   URLs (needed once sign-in ships).
3. Trigger the poller once by hand and confirm an observation row lands:

```bash
curl -H "Authorization: Bearer YOUR_PROD_CRON_SECRET" \
  https://your-app.vercel.app/api/cron/poll?limit=1
```

The `?limit=1` spends exactly one request against the monthly cap.

## 5. Domain

1. Buy the domain at your registrar.
2. Vercel Project Settings, Domains, add it; set the DNS records the panel
   shows (CNAME for www, A or ALIAS for the apex) at the registrar.
3. Wait for the certificate, then open the domain and check the sidebar
   status line reads Polling live after the first scheduled run.

## Key rotation list

Rotate these if ever exposed, and after first production setup:

- RAPIDAPI_KEY (already due: exposed during early de-risk runs)
- CRON_SECRET (separate values for local and production)
- SUPABASE_SERVICE_ROLE_KEY (Supabase dashboard, Settings, API)
- ANTHROPIC_API_KEY
- RESEND_API_KEY, WHATSAPP_TOKEN when those channels are live
