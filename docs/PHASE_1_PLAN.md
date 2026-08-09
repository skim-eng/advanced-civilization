# Phase 1 plan — local vanilla multiplayer validation and hardening

Branch: `test/vanilla-multiplayer`

Phase 0 merge commit: `31fad73503d91f8d4b8b5210e537cbd24ad81975`

## Progress

- Hosted GitHub Actions CI: checkpoint complete and passing; final-HEAD run pending.
- Untouched local two-seat smoke test: complete and recorded.
- Vite proxy credential-log redaction: implemented with unit and process-level regression checks.
- Initial isolated-context Playwright suite: complete and passing locally and in GitHub Actions.
- Comprehensive security characterization and remediation: locally complete at implementation checkpoint `c0ee66fa4b3cddd9b0c3b36647ac718c1be21f26`; final hosted acceptance pending.

## Completion matrix

This is the Phase 1 merge-gate ledger. `BLOCKED` means the documented acceptance test has not yet passed; an implementation commit is recorded only after the corresponding focused change is committed. None of these rows may be converted to an accepted risk merely to close Phase 1.

| Issue | Current behavior | Security / reliability impact | Files affected | Proposed remediation | Tests required | Implementation commit | Verification command | Final status |
|---|---|---|---|---|---|---|---|---|
| SEC-001 / KI-002 | Default configuration makes no upstream hub, identity, counter, rating, analytics, report, or beacon request. Optional owner endpoints require explicit flags. | Player, game, and request metadata stays inside the fork by default. | UI/server service wiring, browser capture, `docs/NETWORK_ALLOWLIST.md` | Complete; retain default-off flags and allowlist. | Browser/server capture with functional local multiplayer and zero unexpected egress. | `447d92c` | `npm test && npm run test:e2e` | LOCAL PASS; HOSTED PENDING |
| SEC-002 / KI-003 | Administrative routes are absent by default; explicit enablement requires a strong server-only Authorization bearer and returns sanitized metadata. | Anonymous/player credentials cannot enumerate or alter reports. | router/admin wiring/tests, `docs/REPORTING_POLICY.md` | Complete; retain separate default-off admin boundary. | Anonymous, player, foreign identifier, bad admin, disabled, and valid enabled-admin cases. | `132d5d8` | `npm test` | LOCAL PASS; HOSTED PENDING |
| SEC-003 / KI-004 | Ordered SQL contains every framework 0.42 field; fresh persistent PGlite PostgreSQL completes create/seats/projections/move/message/restart/reconnect/continue/delete/purge. | Fresh databases reproduce the server lifecycle without manual drift. | schema/migrations/lifecycle tests, `docs/SCHEMA_MIGRATIONS.md` | Complete locally; owner Supabase service verification remains a Phase 2 pre-deployment gate. | From-zero migration, required-column assertion, full lifecycle, restart, cleanup. | `fd9f15a` | `npm run test:schema` | LOCAL PASS; HOSTED PENDING |
| SEC-003-RLS | Clean PostgreSQL proves all RLS flags, no public policies, browser-role CRUD denial, and service-role lifecycle. Browser artifacts contain no server secrets; Realtime wire payload is state-free. | Browser roles cannot directly read tokens, snapshots, messages, or reports. | migrations/RLS/browser-secret/Realtime tests | Complete Phase 1 control; repeat through PostgREST/hosted Realtime before deployment. | Browser-role denial, privileged lifecycle, artifact scan, exact broadcast payload. | `fd9f15a`, `171b839` | `npm run test:rls && npm run test:secrets && npm test` | LOCAL PASS; HOSTED PENDING |
| SEC-004 / SEC-005 / KI-005 / KI-006 | Node/Pages use 256-bit IDs; fragment invitations exchange for encrypted HttpOnly scoped cookies and leave URL/history/referrer/diagnostics. Query credentials are rejected. | Seat identity uses cryptographic bearer material without persistent URL exposure. | secure ID/session/router/client/browser tests | Complete; invitation revocation/rotation is explicitly unsupported and remains pre-production product work if required. | Uniqueness; invalid/cross-game; copy/reuse/reconnect/restart/refresh; cookie scope; referrer/history/log/console/artifact checks. | `56e6a41`, `c0ee66f` | `npm test && npm run test:e2e && npm run test:secrets` | LOCAL PASS; HOSTED PENDING |
| SEC-013 | Canonical state inventory now redacts hands, calamities, deck order, RNG, provenance, offers, completed deals, pending choices, expansion/revolt maps, and resume metadata by role. | Private state and private legal actions do not cross seat/API boundaries. | `src/engine/projection.test.ts`, raw API tests, `docs/HIDDEN_STATE_MATRIX.md` | Complete; maintain the matrix with every future state field. | Raw responses for every 2/4/6 seat, unauth/cross-game denial, off-clock legal actions, admin/spectator absence. | `171b839`, `c0ee66f` | `npm test && npm run test:e2e` | LOCAL PASS; HOSTED PENDING |
| SEC-010 | Client reporter IDs, player lookup, reporting UI, and legacy broadening are removed; reporting is disabled. | A browser marker cannot authorize stored-data access. | client/router/UI/tests/policy | Complete; any future reporting feature needs a new authenticated minimal design. | Foreign identifier reveals nothing; no client submission; no player report retrieval. | `132d5d8` | `npm test && npm run test:e2e` | LOCAL PASS; HOSTED PENDING |
| SEC-011 / KI-011 | Node/Pages enforce JSON/64 KiB/shape limits, revision-aware moves, random request IDs, and fixed safe errors. | Malformed/stale/duplicate/raced requests cannot replay a transition or expose backend data. | parsers/router/client/tests/policy | Complete. Provider access/rate limiting remains a Phase 2 deployment control. | Empty/malformed/oversize/unknown/nested/stale/duplicate/race/wrong-seat/failure/error cases. | `c2f2cae` | `npm test && npm run test:e2e` | LOCAL PASS; HOSTED PENDING |
| SEC-007 / KI-013 | Player/standalone reports and crash uploads are disabled; permitted fields, body size, and retention are zero. Legacy purge is tested. | Phase 1 creates no secondary hidden-state store. | router/client/UI/schema/policy tests | Complete; purge legacy rows before any environment approval. | Disabled endpoints/UI, foreign denial, sanitized admin, fresh-schema full purge. | `132d5d8`, `fd9f15a` | `npm test && npm run test:schema && npm run test:e2e` | LOCAL PASS; HOSTED PENDING |
| SEC-008 / KI-007 | Patched compatible Vite/Vitest/plugin majors are pinned; full and production audits are zero. | Seven baseline development findings are removed from the locked tree. | manifests/config/audit record/CI | Complete; retain exact tested tool versions. | Clean install, both audits, unit, typecheck, builds, Playwright. | `a33fccb` | `npm ci && npm audit && npm audit --omit=dev && npm test && npm run typecheck && npm run build && npm run build:ui && npm run test:e2e` | LOCAL PASS; HOSTED PENDING |
| KI-009 | Version metadata is ignored build output; repeated builds compare 156 deterministic artifacts and leave Git clean. | Normal builds no longer alter tracked metadata. | Vite/build verifier/CI | Complete. | Clean start, repeat builds, equivalent output except `version.json`, empty status. | `ef16365` | `npm run verify:clean-build` | LOCAL PASS; HOSTED PENDING |

## Scope and order

1. Establish hosted CI for the locked install, 174-test baseline, typecheck, server build, and UI build.
2. Verify the untouched two-seat local browser/API path with isolated temporary filesystem persistence before adding Playwright.
3. Add Playwright in a separate focused commit, using a distinct browser context per seat and sanitized artifacts. **Complete for the initial two-seat authorization/concurrency suite.**
4. Add characterization and negative tests before remediation, prioritized as follows:
   - seat-token generation, cross-game isolation, URL/referrer/log/artifact leakage;
   - exhaustive server-side hidden-information projection;
   - report-listing, report-resolution, report retention, and reporter lookup authorization;
   - default-off upstream hub, play-beacon, identity, leaderboard, analytics, rating, email, and reporting integrations;
   - malformed, oversized, stale, duplicate, and near-simultaneous requests;
   - schema-from-zero reproducibility and Supabase RLS assumptions;
   - compatibility-tested development-toolchain vulnerability remediation.
5. Repair each confirmed security boundary in a small commit with its regression tests and update the architecture, decisions, deviations, known issues, and results records.

## Phase boundaries

- Do not deploy to Cloudflare or provision staging/production Supabase during Phase 1.
- Do not change rules, action legality, map data, game data, graphics, artwork, deterministic seeded behavior, or gameplay outcomes.
- Do not enable any external service by default.
- Do not log or attach game IDs, invitation URLs, seat tokens, private hands, full snapshots, or service credentials.
- Playwright installation is authorized only after the untouched local baseline result recorded in `MULTIPLAYER_TEST_RESULTS.md`.

## Phase 1 completion gate

Phase 1 is not complete until the merge-gate items marked `MUST_FIX_BEFORE_PHASE_1_COMPLETION` have passing local and hosted tests, the manual browser/device record is complete to the extent locally available, all required verification commands pass, and the owner accepts a Phase 1 report. Phase 2 deployment remains separately gated.
