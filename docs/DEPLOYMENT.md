# Vanilla staging deployment runbook

## Status

Phase 2 created the dedicated Supabase project `csbcmaiytgotctodxahz` and the
Cloudflare Pages project `kimsvideo-civ-vanilla`. The private basic version is
deployed at `https://kimsvideo-civ-vanilla.pages.dev` behind Cloudflare Access.
Validated source `36c974e5e9dc44d3ebe77cf8d67dc6f69ea93846` is production deployment
`7b06806f-b8c1-46c4-8cd4-dcbd30a19625`.

Zero Trust Free was activated only after explicit owner authorization. Checkout
was `$0`; the final billing screen remained `$0.00` and within included limits.
Do not enable a paid plan or pay-as-you-go add-on.

### Access billing investigation

Read-only reinspection on 2026-08-09 found no no-card or hard-cap path in the
current account:

- Cloudflare's [Zero Trust setup documentation](https://developers.cloudflare.com/cloudflare-one/setup/)
  says payment details are required even for Zero Trust Free.
- Cloudflare's [current Zero Trust pricing](https://www.cloudflare.com/plans/zero-trust-services/)
  advertises Free as `$0 forever` with a 50-user limit.
- The owner account has no active Zero Trust subscription or dormant Access
  entitlement. Opening Access redirects to plan onboarding.
- The account checkout says `$0/month` and `Protect up to 50 users at no cost`,
  but also says additional usage beyond the included allowance is billed
  monthly. Activation requires a separate checkbox authorizing Cloudflare to
  charge the stored payment method for usage exceeding free limits each month
  until cancellation.
- The Billing UI exposes monitoring and budget alerts, not a zero-dollar hard
  cap. Its auto-created alert is `$10`. Cloudflare's [official billing
  changelog](https://developers.cloudflare.com/changelog/product/billing/)
  states that budget alerts are informational only and do not cap usage or
  affect the account.

The owner later explicitly authorized that exact Free-plan checkbox. The plan
was activated at `$0`; Access, rather than application Basic Auth, protects the
production alias and wildcard Pages preview hostname. After acceptance testing,
temporary service/browser policies and credentials were removed, leaving only
the owner production policy and owner-member preview policy.

The selected Cloudflare account currently reports zero domains or subdomains,
so it does not contain the `kimsvideo.org` zone. The conditional custom-domain
step is therefore not applicable and no DNS record was changed.

The upstream-supported architecture is retained: Cloudflare Pages + Pages
Functions, Supabase Postgres, and optional state-free Supabase Realtime. Resend
and all nonessential integrations remain disabled. The project name is
`kimsvideo-civ-vanilla`.

## Prerequisites

1. Owner-controlled GitHub fork and reviewed deployment commit.
2. Owner-controlled Cloudflare and Supabase accounts.
3. Cloudflare Access policy defined before coworker access.
4. Reviewed Supabase migration compatible with framework 0.42.0, including `identities` and `ranked_report` or an intentional removal of those writes.
5. Secure game/seat ID generation in both Node and Pages Function.
6. Upstream hub, public report triage, and unneeded email/ratings integrations disabled.
7. Passing tests, typecheck, server build, UI build, browser suite, and clean bundle/secret scan at the deployment SHA.

## Build settings

- Pages project: `kimsvideo-civ-vanilla`
- Production build command: `npm run build:ui`
- Output directory: `dist-ui`
- Functions directory: repository `functions/` (compiled by Pages)
- Node version: use the supported version selected and pinned by Phase 1 CI; Phase 0 verified Node 24.14.0 locally.
- Wrangler config: `wrangler.toml` with `pages_build_output_dir = "dist-ui"` and `nodejs_compat`.

Verify that deployment builds both `dist-ui` and the catch-all `functions/api/[[path]].ts`. A static-only success is not a multiplayer deployment.

Wrangler 4.120.0 compiled the current Pages Functions locally. The Pages
project is configured fail-closed when the Functions free allowance is
exhausted; it must never silently serve a static-only multiplayer shell.

## Supabase migration

The upstream instruction is to apply `supabase/schema.sql`, but the Phase 0 audit found it incompatible with current framework writes. Phase 2 must use a reviewed migration rather than the unmodified file.

Required procedure:

1. Create a dedicated staging Supabase project and record its project reference (never a key).
2. Apply the reviewed schema/migration through the Supabase SQL editor or versioned CLI migration.
3. Confirm `dbf_games`, `dbf_snapshots`, `dbf_messages`, and `dbf_reports` plus expected columns/indexes.
4. Confirm RLS is enabled on every table and no anon select/insert/update/delete policy exists.
5. Test anon-key table reads and require denial/empty access.
6. Test create/fetch/move/message/report through the Pages Function using the service-role key stored only in Cloudflare.
7. Confirm Realtime uses broadcast signals and does not publish table change rows.
8. Record backup/export and test-data cleanup procedures before coworker testing.

## Environment configuration

### Server-only Cloudflare secrets/variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` — secret, service role, never exposed to Vite
- `PUBLIC_BASE_URL=https://civ-vanilla.kimsvideo.org`

Current initial value: `PUBLIC_BASE_URL=https://kimsvideo-civ-vanilla.pages.dev`.
`SUPABASE_SERVICE_KEY` and `SESSION_SECRET` are stored as encrypted secrets.
Only names, never values, are recorded.

Keep these unset for the first deployment unless explicitly approved:

- `RESEND_API_KEY`
- `MAIL_FROM`
- `RATINGS_INGEST_KEY` (must remain unset; points to an upstream leaderboard)

### Client-safe values, only when Realtime is tested

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The anon key is public by design; security depends on RLS and Realtime channel design. Never create `VITE_SUPABASE_SERVICE_KEY` or inject any service-role value into the build environment.

## Pre-deploy secret and artwork checks

Run from a clean checkout of the recorded deployment SHA:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run build:ui
find dist-ui -type f -name '*.map' -print
git ls-files | grep -E '(^|/)(\.env|\.dev\.vars|.*\.vmod$|map-(main|western|eastern)\.svg$)'
```

Then search `dist-ui` for the **known secret value through a non-printing matcher** in the deployment shell and fail if matched; do not paste or echo the secret into logs. Also search for secret variable names and known upstream hostnames. Confirm no VASSAL module or extracted map SVG is in the artifact.

## Access control and headers

Protect both the site and `/api/*` with Cloudflare Access. Test from an unauthenticated browser and raw HTTP client.

Required response policy:

| Control | Required intent |
|---|---|
| `Referrer-Policy: no-referrer` | Never forward token-bearing URLs. |
| `X-Content-Type-Options: nosniff` | Prevent content-type sniffing. |
| `Content-Security-Policy` | Restrict scripts/styles/connect targets; allow same-origin, owner Supabase HTTPS/WSS only if configured, and needed `blob:` board-art images. Use `frame-ancestors 'none'`. |
| `Strict-Transport-Security` | HTTPS-only after confirming the domain is correctly served. |
| `X-Frame-Options: DENY` | Compatibility defense alongside CSP frame-ancestors. |
| `Permissions-Policy` | Disable camera, microphone, geolocation, and other unused capabilities. |
| `X-Robots-Tag: noindex, nofollow, noarchive` | Prevent indexing of private evaluation content. |
| `robots.txt` | `Disallow: /` as a secondary signal, not an access control. |

Avoid broad CORS unless a tested requirement exists. Prefer same-origin API calls.

## Initial deployment sequence

1. Build and test the recorded commit from a clean checkout.
2. Apply the reviewed Supabase migration and run RLS/schema tests.
3. Create `kimsvideo-civ-vanilla` in Cloudflare Pages from the owner fork.
4. Configure server secrets and required variables in Cloudflare, not repository files.
5. Deploy and record the exact Git SHA and Pages deployment identifier.
6. Validate the private default `*.pages.dev` URL, including Access on both SPA and API.
7. Run the deployed multiplayer/security subset in `MULTIPLAYER_TEST_PLAN.md`.
8. Add custom domain `civ-vanilla.kimsvideo.org` in **Cloudflare Pages → project → Custom domains → Set up a custom domain**. Follow the displayed DNS record/zone confirmation, wait for the certificate to become Active, then set `PUBLIC_BASE_URL` to the custom URL and redeploy.
9. Repeat access, invitation, referrer, API, and multiplayer checks on the custom domain.
10. Run limited load/soak testing, remove test data, and complete `VANILLA_STAGING_ACCEPTANCE.md`.

Do not modify or link from the main `kimsvideo.org` homepage in this phase.

## Rollback and incident controls

- **Cloudflare rollback:** Pages project → Deployments → select the last known-good deployment → Rollback to this deployment. Revalidate Functions as well as static assets.
- **Supabase free-plan recovery:** automatic backups and point-in-time recovery
  are unavailable on the selected plan. Before any future schema change, create
  an untracked logical dump with the Supabase CLI/`pg_dump`, verify its checksum
  without printing credentials, and keep the ordered migrations as the
  canonical schema recovery source. Restore only into a separate disposable
  project/database and compare the reviewed catalog before changing staging.
  The current schema-recovery path was rehearsed by applying the canonical
  migration from zero in hosted staging and in isolated PGlite. No owner game
  data exists yet, so a data-restore claim is neither needed nor made.
- **Disable game creation:** apply an emergency Pages/Access rule that blocks `POST /api/games` or roll back to a deployment with creation disabled; do not rely on hiding the button.
- **Leaked service key:** rotate the Supabase service-role secret, update the Cloudflare encrypted secret, redeploy, review logs, and revoke the old key. Never place either value in a ticket or screenshot.
- **Leaked seat link:** no revocation mechanism exists in baseline. Archive/delete the affected test game and create a new one; long-term session/token rotation is required.
- **Test-game cleanup:** identify staging games by recorded IDs/time window, export if required, then delete through a reviewed administrative procedure. Avoid broad unqualified deletes.
- **Reports:** game deletion does not remove reports. Apply the separately documented retention/deletion process.

Cloudflare rollback was rehearsed from `7b06806f-b8c1-46c4-8cd4-dcbd30a19625`
to `8f3a86e3-bdbb-4805-9c9d-a6d869d6e8ea` and restored. Access, Function
health, and persisted state passed after both transitions. Targeted cleanup
removed the 34 recorded acceptance games and verified all four tables empty.

## Evidence to record in Phase 2

Default and custom URLs, deployment SHA and ID, Cloudflare project identifier, Supabase project reference, migration checksum, access policy, environment variable names (never values), all test results, bundle sizes, secret/artwork scan results, request/error counts, Realtime/polling measurements, load limits, quota observations, rollback drill, and every deviation from the vanilla baseline.
