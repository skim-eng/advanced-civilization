# Vanilla staging acceptance

Date: 2026-08-09
Branch: `codex/phase2-vanilla-staging`
Phase 1 merge: `ba773789c52f3757f68ea459abeb7da8a8f01f27`
Current implementation checkpoint: `59cf3e3bced82f3bbd5db8e9918f313aa864e283`

## Current disposition

**FAIL — not yet deployable or ready for owner testing.**

The data provider and local deployment controls pass, but the mandatory
Cloudflare Access gate cannot be activated without explicit authorization for
possible card charges above free-plan allowances. No public deployment was
made and this disposition must not be weakened to a conditional pass.

## Resource record

| Resource | Identifier / result |
|---|---|
| Supabase project | `csbcmaiytgotctodxahz`, `us-east-1`, Free |
| Migration | `202608090001_phase1_schema.sql`; SHA-256 `78c377bbde6417871177833aec31cb8fdefb7df86e9c3873f1f4af13a46801c2` |
| Cloudflare Pages project | `kimsvideo-civ-vanilla`; production branch `codex/phase2-vanilla-staging` |
| Intended Pages URL | `https://kimsvideo-civ-vanilla.pages.dev` — not deployed |
| Deployment SHA / ID | None |
| Custom domain | Not configured; selected Cloudflare account has zero zones |
| Cloudflare Access | Not active; blocked by overage-charge authorization |
| Secrets | `SUPABASE_SERVICE_KEY` and `SESSION_SECRET` encrypted in Pages; no values recorded |

## Evidence so far

- Hosted catalog: four expected tables, reviewed columns/indexes, RLS on, zero
  policies, browser grants absent, service grants present.
- Hosted PostgREST: anon reads `401` x4; authenticated reads `403` x4; service
  inserts `201` x4; service reads `200` with one row x4; targeted deletes `204`
  x2; cleanup counts `0` x4; temporary Auth user deleted.
- Hosted Realtime: subscription connected; framework broadcasts succeeded;
  move payload keys exactly `turn`, message payload keys empty; zero `dbf_*`
  publication entries.
- Targeted provider fixtures and the temporary Auth user were removed. Schema
  recovery was rehearsed by applying the canonical migration from zero locally
  and in hosted staging; the Free plan has no automatic/PITR backup and no data
  restore is claimed before owner test data exists.
- Local Pages packaging: Wrangler 4.120.0 compiled the Functions worker; Pages
  is configured fail closed; encrypted and plaintext variable classifications
  were verified by name only.
- Deployment policy tests: 3/3 passed; the current unit suite is 202/202;
  typecheck and UI build passed; local Playwright remained 6/6 after hosted-mode
  changes.
- Artifact gate: four browser files and one compiled Functions file; no source
  maps, VASSAL module, extracted board image, OCR rules PDF, or prohibited
  deploy-only asset.
- Phase 2 CI now compiles the Pages Functions with pinned Wrangler 4.120.0 and
  rejects a static-only deployment bundle before Playwright.

## Integrity and history confirmations

- Annotated tag `john-vanilla-2026-08-09-4b3f981^{}` and
  `origin/archive/john-vanilla` both resolve to the protected upstream baseline
  `4b3f981cdf4b3cefbb8f523b0d78c9eb320e1422`.
- Local and remote `main` both resolve to the Phase 1 merge commit
  `ba773789c52f3757f68ea459abeb7da8a8f01f27`.
- Phase 2 changes no game engine, `src/data`, map, board, artwork, graphics,
  scoring, rule, legality, or deterministic-RNG file. It changes only
  deployment policy/configuration, tests/tooling, CI dependencies, and records.
- The Pages artifact manifest contains no VASSAL module, extracted board
  artwork, OCR rules PDF, source map, credential fixture, or deploy-only
  proprietary asset. No secret value is committed or recorded.

The final clean install, audits, full unit gate, schema/RLS suites, server/UI
builds, deterministic build, exact-SHA Functions build, hosted 2/4/6 matrix,
ten-game soak, rollback, backup/export rehearsal, and final cleanup are not yet
claimed here.

## Blockers

| ID | Severity | Evidence | Required remediation | Acceptance test | Disposition |
|---|---|---|---|---|---|
| P2-B001 | Critical deployment gate | Zero Trust Free checkout states `$0/month` but requires authorizing charges to the stored card for usage beyond included allowances | Owner explicitly approves that authorization, or supplies a charge-free Access-equivalent path | Access protects the Pages hostname and `/api/*`; unauthenticated browser/raw clients denied and authorized clients pass | MUST_FIX_BEFORE_PHASE_2_DEPLOYMENT |
| P2-B002 | Informational conditional feature | Cloudflare domain inventory reports zero domains/subdomains | No action in this account; configure the custom domain later only after an owner-controlled zone exists without purchase or unrelated DNS change | Zone/TLS/DNS and full retest if ever configured | ACCEPTED_DEVELOPMENT_RISK |
| P2-B003 | Critical acceptance dependency | No public deployment exists because P2-B001 is unresolved | After Access is ready, deploy exact green SHA and complete the full hosted/security/soak/rollback/cleanup matrix | All rows P2-08 through P2-17 in `PHASE_2_PLAN.md` pass | MUST_FIX_BEFORE_PHASE_2_DEPLOYMENT |

## Stop boundary

Phase 3 and all custom-game work remain unauthorized. No rules, legality,
game/map data, graphics, scoring, deterministic RNG, or normal vanilla gameplay
behavior changed.
