# Vanilla network destination allowlist

Default status: **external network access denied**.

The vanilla local and future private-staging configuration requires only same-origin browser requests. A local browser talks to the Vite origin, which proxies `/api/*` to the loopback Node server. The Node server uses its isolated filesystem store. Version checks load same-origin `/version.json`. No default path contacts the upstream games hub, identity, counter, leaderboard, ratings, analytics, email, reporting, Supabase, or Realtime services.

## Default destinations

| Caller | Destination | Purpose | Data permitted |
|---|---|---|---|
| Browser | Its own application origin | UI assets, `/version.json`, and `/api/*` | The authenticated, server-redacted response for that browser session. |
| Local Vite server | Configured loopback `VITE_API_URL` (default `http://localhost:8787`) | Development-only same-machine API proxy | HTTP request/response after log redaction. |
| Local Node server | Local filesystem under `DBF_DATA_DIR` | Game persistence | Server-only game metadata and snapshots; no network request. |

The VASSAL module link in the bring-your-own-art dialog is an explicit top-level user navigation, never an automatic application request. It uses `rel="noopener noreferrer"`; the application does not bundle or fetch that module or its artwork.

## Explicitly enabled owner destinations

These destinations are outside the default allowlist. They may be enabled only by the named configuration and must point to infrastructure controlled and approved by the owner.

| Integration | Required explicit configuration | Permitted destination / data |
|---|---|---|
| Owner hub counter, identity verification, and ratings | Server: `ENABLE_UPSTREAM_SERVICES=true` plus `UPSTREAM_HUB_URL`; browser counter: `VITE_ENABLE_UPSTREAM_SERVICES=true` plus `VITE_UPSTREAM_HUB_URL` | Only the configured base URL. Counter events contain application ID and mode. Identity JWKS is read server-side. Ratings also require server-only `RATINGS_INGEST_KEY`. |
| Supabase persistence/broadcast | Server-only `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` | Configured Supabase project; authoritative rows remain server-only. |
| Supabase Realtime polling accelerator | `VITE_SUPABASE_URL` and client-safe `VITE_SUPABASE_ANON_KEY` | Configured Supabase project; only non-state invalidation broadcasts are permitted. RLS must deny table access. |
| Email reminders | Server-only `RESEND_API_KEY` and approved `MAIL_FROM` | Resend API through the framework notifier; recipient email, game link, game ID, and turn number. Disabled when the key is absent. |

Administrative report forwarding and analytics have no enabled destination in Phase 1. Reporting is addressed separately in the Phase 1 reporting gate. Cloudflare and hosted Supabase remain out of scope until Phase 2 authorization.

For Phase 2 private staging, the only additional browser destination is the
exact owner Supabase HTTPS/WSS origin for state-free Realtime. The authoritative
API remains same-origin behind Cloudflare Access. The Functions server may call
the exact owner Supabase origin for PostgREST and broadcast; no email, hub,
identity, rating, reporting, analytics, or beacon destination is configured.

## Enforcement

- Browser tests intercept every HTTP(S) request, permit loopback application origins only, and fail if any other origin is observed.
- Server tests prove an endpoint alone does not enable upstream services; the explicit flag and a valid HTTP(S) owner URL are both required.
- CI runs with no external-service, hosted-database, email, or production credentials.
- Any future destination requires updating this file and adding a negative default-egress regression test before it can be enabled.
