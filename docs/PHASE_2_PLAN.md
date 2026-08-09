# Phase 2 private vanilla staging plan

Date authorized: 2026-08-09  
Branch: `codex/phase2-vanilla-staging`  
Base / Phase 1 merge: `ba773789c52f3757f68ea459abeb7da8a8f01f27`  
Accepted Phase 1 head: `79d479774ca83b8d07a717e08b197a5ac788d62e`  
Accepted hosted runs: push `31319269620`; pull request `31319270762`

## Objective and boundary

Finish the basic version: John Champaign's preserved vanilla application,
privately deployed to owner-controlled Cloudflare Pages/Functions and a
dedicated owner-controlled Supabase staging project, then multiplayer-validated.
Use free tiers only. Do not deploy to production, link from `kimsvideo.org`,
begin Phase 3, or change rules, action legality, map/game data, graphics,
scoring, deterministic RNG, or normal vanilla gameplay.

Planned Cloudflare project: `kimsvideo-civ-vanilla`. First validate its private
Pages URL, then add `https://civ-vanilla.kimsvideo.org` only if the existing
owner-controlled zone permits the reversible DNS change without purchase or a
material owner choice.

## Live acceptance ledger

`PASS` requires every required row below to pass at the exact deployed commit.
An unresolved row is a deployment blocker and must not be converted into an
accepted risk merely to finish the phase.

| Gate | Required evidence | Status |
|---|---|---|
| P2-01 merge and history | PR #2 final head/checks/mergeability reconfirmed; ordinary merge SHA, `main`, baseline branch/tag, branch, PR, and run IDs recorded | PASS — PR #2 merged as `ba773789c52f3757f68ea459abeb7da8a8f01f27`; protected refs will be rechecked at final gate |
| P2-02 clean source gate | Clean checkout of exact deployment SHA: `npm ci`, both audits, 199 unit tests, schema, RLS, typecheck, server/UI builds, secret scan, deterministic build, and six Playwright tests | PENDING |
| P2-03 deployment controls | No broad CORS; same-origin API; CSP, no-referrer, nosniff, HSTS, DENY/frame-ancestors, Permissions-Policy, noindex/nofollow/noarchive, and `robots.txt` deny | PENDING |
| P2-04 Supabase infrastructure | Dedicated owner staging project/reference on free tier; ordered migrations applied from zero; checksum recorded | PENDING |
| P2-05 hosted schema and RLS | Expected tables/columns/indexes/RLS; no public policies; anon/authenticated PostgREST CRUD denial; server-only service lifecycle and targeted cleanup | PENDING |
| P2-06 hosted Realtime | Actual hosted channel emits state-free refresh signals only; unauthorized direct table/state access denied; polling fallback remains functional | PENDING |
| P2-07 Cloudflare infrastructure | Owner Pages project builds `dist-ui` plus `functions/`; deployment SHA/ID and encrypted secret names recorded; upstream/report/analytics/email integrations off | PENDING |
| P2-08 Cloudflare Access | Entire Pages hostname and `/api/*` deny unauthenticated browser and raw HTTP; authorized owner/test access works | PENDING |
| P2-09 private Pages URL | SPA and Function health, headers, invitation/referrer, API, persistence, Realtime/polling, and multiplayer matrix pass | PENDING |
| P2-10 custom domain | Existing zone only; DNS/TLS active, `PUBLIC_BASE_URL` updated, redeployed, and P2-08/P2-09 repeated; otherwise exact blocker recorded | PENDING |
| P2-11 artifact and IP boundary | Built assets/source maps contain no canary/secret/server-only variable/upstream credential/invitation/private fixture; manifest has no VASSAL module, extracted art, OCR rules PDF, or deploy-only proprietary asset | PENDING |
| P2-12 hosted multiplayer/security | Raw API plus isolated browser contexts for 2/4/6 players cover identity/isolation/redaction/auth/legal/off-clock/refresh/reconnect/redeploy persistence/chat/malformed/stale/duplicate/race/failure behavior | PENDING |
| P2-13 invitation diagnostics | Invitation disappears from visible URL/history after exchange and is absent from referrers, logs, console, screenshots, traces, videos, source maps, error bodies, and analytics | PENDING |
| P2-14 limited soak | Ten mixed-seat games within free-tier limits; measured requests/status/latency and Realtime/polling observations recorded without capacity extrapolation | PENDING |
| P2-15 cleanup and rollback | Targeted test-data cleanup; Pages rollback rehearsed; Supabase backup/restore or plan-appropriate rollback documented and exercised to the safe extent supported | PENDING |
| P2-16 records and disposition | Architecture, deployment, decisions, security, issues, deviations, migrations, multiplayer/manual records, and `VANILLA_STAGING_ACCEPTANCE.md` complete with PASS/CONDITIONAL PASS/FAIL | PENDING |
| P2-17 PR/merge gate | Phase 2 PR exact head green and staging revalidated at that head; merge only for PASS, then record/revalidate merge SHA | PENDING |

## Secret handling

Only variable names and non-secret identifiers may enter Git or acceptance
records. `SUPABASE_SERVICE_KEY`, `SESSION_SECRET`, Access service credentials,
and any administrative credential are generated or copied without printing and
stored only in encrypted provider configuration. Client-safe Supabase values
may be built into the UI only after hosted RLS/Realtime verification. Never
create a `VITE_` service-key variable.

Required server configuration is `SUPABASE_URL`,
`SUPABASE_SERVICE_KEY`, `SESSION_SECRET`, and `PUBLIC_BASE_URL`. Keep
`RESEND_API_KEY`, `MAIL_FROM`, `RATINGS_INGEST_KEY`,
`REPORT_ADMIN_ENABLED`, `REPORT_ADMIN_TOKEN`,
`ENABLE_UPSTREAM_SERVICES`, and `UPSTREAM_HUB_URL` absent or disabled.

## Provider and migration procedure

1. Create one dedicated staging Supabase project on the owner's free plan.
2. Apply every `supabase/migrations/*.sql` file in lexical order from an empty
   database and record SHA-256 checksums.
3. Verify catalog shape, indexes, constraints, grants, RLS flags, and zero
   browser policies; exercise anon/authenticated denial through PostgREST.
4. Exercise the service-role create/fetch/move/message/reopen/delete lifecycle
   only through server-side tooling; never make the credential browser-readable.
5. Confirm actual hosted Realtime signals reveal no row or state, and repeat the
   authenticated HTTP projection after each signal.
6. Create/configure the Pages project from the owner fork. A static-only build
   is a failure; `/api/*` must execute the Pages Function.
7. Protect the predicted Pages hostname with Access before sharing it. Use the
   narrowest reversible temporary test policy needed for automation, remove it
   after testing, and leave an owner-only policy.

## Hosted test and soak procedure

Run the matrix in `MULTIPLAYER_TEST_PLAN.md` against the Pages URL and again
against the custom domain if configured. Each seat uses a separate browser
context. Raw responses, not only UI rendering, establish private-state
redaction. Preserve no traces, videos, screenshots, console output, URLs, or
logs containing invitation material.

The soak creates exactly ten tagged test games with mixed 2/4/6-seat shapes,
submits representative legal turns, interrupts/reconnects selected clients,
measures request count/status/latency and refresh mode, then deletes only the
recorded game IDs and verifies their rows/snapshots/messages are gone.

## Rollback, cleanup, and stop condition

Record the last known-good Pages deployment and rehearse provider rollback
without altering unrelated projects or DNS. Use the strongest non-destructive
Supabase export/restore procedure available on the selected free plan; if a
full provider restore is unavailable, preserve the migrations and a sanitized
schema-only export, document point-in-time limitations, and test rollback on
targeted staging data only.

Create `docs/VANILLA_STAGING_ACCEPTANCE.md` with URLs, exact deployment commit
and ID, project references (never keys), migration checksum, Access evidence,
test counts, audits, soak measurements, rollback/cleanup results, limitations,
and final disposition. Stop after private vanilla staging. Do not start Phase 3.
