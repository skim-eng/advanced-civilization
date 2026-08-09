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
| Access investigation base | `a6f5f04b9437bf014ce21663a38b3e3131def9ed` |
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
- Official Cloudflare documentation requires payment details even for Zero
  Trust Free. The owner account has no active Access entitlement; its checkout
  requires recurring overage-charge authorization, and its only visible spend
  control is an informational `$10` budget alert rather than a hard cap. No
  checkbox was selected, no terms were accepted, and nothing was deployed.

## Clean source gate

Fresh checkout: `c96679c75029d0a25edabc3ce9403f6fb84d8ab8`.
The checkout remained clean after the gate.

| Command / check | Result |
|---|---|
| `npm ci` | 122 packages installed; 123 audited |
| `npm audit` | 0 vulnerabilities |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm test` | 20 files; 202/202 tests passed |
| `npm run test:schema` | 1/1 passed |
| `npm run test:rls` | 1/1 passed |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run build:ui` | PASS; main JS 1,031.88 kB raw / 295.44 kB gzip |
| `npm run build:functions` | PASS; Wrangler 4.120.0 compiled the worker |
| `npm run test:secrets` | PASS; 13 names/canary values checked |
| `npm run test:deploy-artifacts` | PASS; 4 browser files, 1 Functions file, 2,257,487 bytes |
| `npm run verify:clean-build` | PASS; 163 deterministic artifacts |
| `npm run test:e2e` | 6/6 passed in 10.1 seconds |

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

The clean source gate must be repeated at the eventual deployment SHA. The
hosted 2/4/6 matrix, ten-game soak, Cloudflare rollback, data restore, and final
hosted cleanup are not yet claimed here.

## Blockers

| ID | Severity | Evidence | Required remediation | Acceptance test | Disposition |
|---|---|---|---|---|---|
| P2-B001 | Critical deployment gate | [Official setup docs](https://developers.cloudflare.com/cloudflare-one/setup/) require payment details even for Free; the account has no active entitlement; checkout requires monthly overage-charge authorization; [official billing guidance](https://developers.cloudflare.com/changelog/product/billing/) says budget alerts do not cap usage | Owner explicitly approves that authorization, or supplies an already-active official Access entitlement with enforceable zero-dollar charge prevention | Access protects the Pages hostname and `/api/*`; unauthenticated browser/raw clients denied and authorized clients pass, with no open-ended billing authorization | MUST_FIX_BEFORE_PHASE_2_DEPLOYMENT |
| P2-B002 | Informational conditional feature | Cloudflare domain inventory reports zero domains/subdomains | No action in this account; configure the custom domain later only after an owner-controlled zone exists without purchase or unrelated DNS change | Zone/TLS/DNS and full retest if ever configured | ACCEPTED_DEVELOPMENT_RISK |
| P2-B003 | Critical acceptance dependency | No public deployment exists because P2-B001 is unresolved | After Access is ready, deploy exact green SHA and complete the full hosted/security/soak/rollback/cleanup matrix | All rows P2-08 through P2-17 in `PHASE_2_PLAN.md` pass | MUST_FIX_BEFORE_PHASE_2_DEPLOYMENT |

## Stop boundary

Phase 3 and all custom-game work remain unauthorized. No rules, legality,
game/map data, graphics, scoring, deterministic RNG, or normal vanilla gameplay
behavior changed.
