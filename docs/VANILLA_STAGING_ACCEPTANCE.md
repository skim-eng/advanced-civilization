# Vanilla staging acceptance

Date: 2026-08-09
Branch: `codex/phase2-vanilla-staging`
Phase 1 merge: `ba773789c52f3757f68ea459abeb7da8a8f01f27`
Validated application commit: `36c974e5e9dc44d3ebe77cf8d67dc6f69ea93846`
Pull request: [#3](https://github.com/skim-eng/advanced-civilization/pull/3)

## Disposition

**PASS — the private vanilla basic version is ready for owner testing.**

Cloudflare Access protects the complete Pages production hostname and every
`/api/*` route. Preview deployment hostnames are separately protected by the
Pages preview restriction. The hosted 2/4/6-player, security, persistence,
Realtime/polling, soak, rollback, recovery, and cleanup gates pass. Phase 3 is
not authorized and has not started.

## Resource and deployment record

| Resource | Identifier / result |
|---|---|
| Private URL | `https://kimsvideo-civ-vanilla.pages.dev` |
| Cloudflare Pages | Project `kimsvideo-civ-vanilla`; account `7a840b63c8f19fb94505a9c452ab7bee` |
| Validated production deployment | `7b06806f-b8c1-46c4-8cd4-dcbd30a19625`; source `36c974e5e9dc44d3ebe77cf8d67dc6f69ea93846` |
| Prior known-good deployment | `8f3a86e3-bdbb-4805-9c9d-a6d869d6e8ea`; same source and bundle |
| Access applications | Production `b845d102-66df-4fe1-8fb4-b2867032f9cf`; previews `7429fde3-f37e-4d54-86d0-e00e60962e62` |
| Final Access policies | Production `Owner only`; previews `Allow Members - Cloudflare Pages` |
| Supabase | Project `csbcmaiytgotctodxahz`, `us-east-1`, Free |
| Migration | `202608090001_phase1_schema.sql`; SHA-256 `78c377bbde6417871177833aec31cb8fdefb7df86e9c3873f1f4af13a46801c2` |
| Exact-source CI | Push `31323540748`; PR `31323542533`; both PASS |
| Custom domain | Not configured: the selected Cloudflare account has zero zones, so no DNS was changed |

Only the encrypted server-side variable names `SUPABASE_SERVICE_KEY` and
`SESSION_SECRET` are recorded. Other required server/client-safe variable names
are in `DEPLOYMENT.md`; no credential value is committed or reproduced here.
Upstream services, ratings, reporting, analytics, email, and owner-hub
integrations remain absent or disabled.

## Exact-source and artifact gate

The full gate passed from a clean checkout of the validated application commit.
The final acceptance-record commit changes documentation only and is subject to
the same GitHub Actions gate and a private Pages redeployment before merge.

| Command / check | Result |
|---|---|
| `npm ci` | 122 packages installed; 123 audited |
| `npm audit` / `npm audit --omit=dev` | 0 vulnerabilities / 0 vulnerabilities |
| `npm test` | 20 files; 202/202 tests passed |
| `npm run test:schema` / `npm run test:rls` | 1/1 / 1/1 passed |
| `npm run typecheck` | PASS |
| `npm run build` / `npm run build:ui` | PASS / PASS |
| `npm run build:functions` | PASS; Wrangler 4.120.0 compiled the Pages Function |
| `npm run test:secrets` | PASS; eight deployed browser names/values checked without printing values |
| `npm run test:deploy-artifacts` | PASS; four browser files, one Functions file, 2,257,567 bytes |
| `npm run verify:clean-build` | PASS; 163 deterministic artifacts |
| Local Playwright | 6/6 passed in 10.1 seconds |
| Hosted Playwright | 7/7 passed in 14.5 seconds |

The deployed browser/Functions manifests contain no source map, secret canary,
server-only credential, invitation material, private-state fixture, upstream
hostname, VASSAL module, extracted board artwork, OCR rules PDF, or proprietary
deploy-only asset.

## Private-hosting and security evidence

- Zero Trust Free activation displayed `$0/month`; the final billing screen
  displayed `$0.00`, no cost data, and all usage within included limits. No paid
  add-on was enabled.
- Unauthenticated raw requests to both the production alias and immutable
  deployment hostname returned Access redirects for `/` and `/api/health`.
  Revoked automation credentials also returned Access redirects.
- An owner-authorized browser completed Access and received the SPA and
  `{"ok":true}` health response. The temporary browser and service-test
  policies/tokens were then deleted, and logout returned the browser to Access.
- The hosted SPA, `robots.txt`, and API expose HSTS, CSP with
  `frame-ancestors 'none'`, `no-referrer`, `nosniff`, `DENY`, restrictive
  Permissions-Policy, and noindex/nofollow/noarchive. `robots.txt` disallows
  `/`. The API has no broad CORS; Cloudflare's static-asset CORS header does not
  apply to `/api/*`.
- Direct browser-role table reads remain denied. Hosted Realtime carries only
  `{turn}` or `{}` refresh signals, publishes no `dbf_*` table, and clients
  refetch a server-redacted view.
- The legacy Supabase JWT signing key encountered during provider inspection was
  revoked after the Pages secret was rotated to the current key path. The old
  key now receives `401`; the private Pages store still reaches the database
  with sanitized errors.

## Hosted multiplayer and resilience results

- Separate contexts for 2, 4, and 6 players received distinct seats,
  credentials, and identities. Invalid and cross-game credentials were denied.
- Raw responses exposed no rival hand, future deck identity, RNG state,
  calamity provenance, invitation, or seat token. Cross-game chat access was
  denied.
- Legal/on-clock play, off-clock rejection, malformed/oversized/unsupported
  inputs, stale and duplicate revisions, and concurrent races behaved safely;
  exactly one raced transition committed.
- Refresh, copied-invitation/fresh-browser reconnect, repeated polling,
  state-free hosted Realtime refresh, and persistence across a Pages redeploy
  passed. The persisted turn and private projected-view hash were unchanged.
- Invitation material disappeared from the visible URL/history after exchange
  and was absent from referrer probes, logs, console output, test artifacts,
  source maps, error bodies, and analytics. No unexpected browser egress was
  observed.

## Bounded soak, rollback, recovery, and cleanup

Ten tagged games used seat shapes 2 players x4, 4 players x3, and 6 players x3.
The run made 117 requests: 116 expected `200` responses and one deliberate
cross-game `401`. Measured latency was 394.50 ms p50, 873.38 ms p95, and
1,242.91 ms maximum. Realtime refresh measured 333.46–1,238.69 ms; polling
fallback measured 2,985.70–3,893.67 ms. Four reconnects passed, all Realtime
payloads contained only `turn`, chat isolation passed, and 38 hidden-projection
checks passed. These are measurements of the bounded run, not a capacity claim.

Cloudflare successfully rolled production from `7b06806f…` to known-good
`8f3a86e3…`, then restored `7b06806f…`; Access, health, and the persisted game
were revalidated after both transitions. Supabase Free has no automatic/PITR
restore. The plan-appropriate recovery rehearsal applied the checksum-pinned
migration from zero in isolated PostgreSQL and hosted staging. Targeted cleanup
removed all 34 recorded game IDs and verified zero rows in all four `dbf_*`
tables.

Final provider usage remained within the Free plan: database 0.027 GB,
Realtime peak connections 1, MAU 2, egress 0 GB, and storage 0 GB. Realtime
message counts in the dashboard may lag and are not used as acceptance counts.

## Blocker disposition

| ID / title | Severity | Evidence | Source / environment | Required remediation | Acceptance test | Disposition |
|---|---|---|---|---|---|---|
| P2-B001 — Access activation | Resolved critical gate | Owner authorized Zero Trust Free; checkout was exactly `$0`; Access denies unauthenticated alias, preview, and API requests | Provider requirement; staging | None; monitor Free limits and do not add paid services | Raw/browser denial plus owner-authorized SPA/API access | ACCEPTED_DEVELOPMENT_RISK |
| P2-B002 — Custom domain unavailable | Informational | Cloudflare account has zero zones; the private Pages URL passes the full gate | Provider/account baseline; staging | Configure `civ-vanilla.kimsvideo.org` only if an owner-controlled zone later becomes available without purchase/unrelated DNS change | TLS, Access, referrer, API, and multiplayer retest | ACCEPTED_DEVELOPMENT_RISK |
| P2-B003 — Physical-device matrix | Accepted device limitation | Automated desktop contexts cover hosted 2/4/6-player and reconnect behavior; physical mobile sleep/network-switch tests were not available | Test-environment limitation; staging | Run the documented physical-device matrix before broader sharing if required | iPhone Safari, Android Chrome, background/resume, and network switching | ACCEPTED_DEVELOPMENT_RISK |

There is no open `MUST_FIX_BEFORE_PHASE_2_DEPLOYMENT` issue.

## Integrity and stop boundary

- No secret is committed or present in the deployment artifact.
- No VASSAL module or extracted board artwork is committed or deployed. The
  upstream-tracked OCR rules PDF remains preserved in repository history but is
  excluded from the Pages deployment manifest.
- Advanced Civilization rules, action legality, map/game data, graphics,
  scoring, deterministic RNG, and normal vanilla gameplay are unchanged.
- Every Phase 2 deviation is recorded in `VANILLA_DEVIATIONS.md`.
- The protected tag and `origin/archive/john-vanilla` resolve to
  `4b3f981cdf4b3cefbb8f523b0d78c9eb320e1422`.

Stop after private vanilla staging. Do not start Phase 3 or custom redesign.
