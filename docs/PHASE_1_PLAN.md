# Phase 1 plan — local vanilla multiplayer validation and hardening

Branch: `test/vanilla-multiplayer`

Phase 0 merge commit: `31fad73503d91f8d4b8b5210e537cbd24ad81975`

## Progress

- Hosted GitHub Actions CI: complete and passing.
- Untouched local two-seat smoke test: complete and recorded.
- Vite proxy credential-log redaction: implemented with unit and process-level regression checks.
- Initial isolated-context Playwright suite: complete and passing locally and in GitHub Actions.
- Comprehensive security characterization and remediation: in progress; Phase 1 is not complete.

## Completion matrix

This is the Phase 1 merge-gate ledger. `BLOCKED` means the documented acceptance test has not yet passed; an implementation commit is recorded only after the corresponding focused change is committed. None of these rows may be converted to an accepted risk merely to close Phase 1.

| Issue | Current behavior | Security / reliability impact | Files affected | Proposed remediation | Tests required | Implementation commit | Verification command | Final status |
|---|---|---|---|---|---|---|---|---|
| SEC-001 / KI-002 | Upstream UI integrations have been removed; optional counter/identity/rating wiring now requires explicit flags and owner URLs. Final browser and hosted verification remains pending. | Player, game, and request metadata must not leave the fork without owner approval. | `src/ui/App.tsx`, `src/ui/main.tsx`, `src/ui/online.tsx`, `src/server/game-server.ts`, `functions/api/[[path]].ts`, `docs/NETWORK_ALLOWLIST.md` | Keep upstream defaults absent; permit optional services only through explicit default-off flags and owner-controlled endpoints; enforce the documented network allowlist. | Browser and server request capture proves zero unexpected egress while local multiplayer remains functional. | Pending | `npm test && npm run test:e2e` | IN PROGRESS |
| SEC-002 / KI-003 | Report list/resolve routes are anonymously callable and return framework report rows. | Full reports can be enumerated or modified without administrative authorization. | `src/server/handlers.ts`, Node/Pages request wiring, API tests | Disable administration by default; when explicitly enabled require a server-only bearer credential and return only the approved report shape. | Anonymous, player, foreign-reporter, disabled-feature, bad-admin, and valid-enabled-admin cases. | Pending | `npm test -- src/server` | BLOCKED |
| SEC-003 / KI-004 | Checked-in SQL lacks `dbf_games.identities` and `ranked_report`; no ordered migration path exists. | A database created from the repository cannot reliably support framework 0.42 writes. | `supabase/schema.sql`, new `supabase/migrations/*`, schema test and documentation | Make migrations canonical and reproducible from zero, align every written field, and test a complete persisted lifecycle with restart and cleanup. | Fresh migration plus create/seat/fetch/move/message/report-when-enabled/restart/reconnect/continue/delete lifecycle. | Pending | `npm run test:schema` | BLOCKED |
| SEC-003-RLS | SQL enables RLS, but no clean-database test exercises anon denial and server-role access. | A schema or role regression could expose seat credentials and full snapshots. | migrations, RLS integration test, CI, browser-artifact scan | Exercise real PostgreSQL RLS in an isolated reproducible database; verify anon denial, server lifecycle, and no server secret in UI output. | SELECT/INSERT/UPDATE/DELETE denial for anon; privileged lifecycle; built-output/source-map scan; Realtime-default-off proof. | Pending | `npm run test:rls && npm run test:secrets` | BLOCKED |
| SEC-004 / SEC-005 / KI-005 / KI-006 | Node and Pages inject 256-bit cryptographic IDs. Invitations carry credentials in fragments, exchange them for AES-GCM-protected HttpOnly game-path cookies, and remove them with `replaceState`; query credentials are rejected. Process-restart and final artifact verification remain. | Seat authentication no longer depends on predictable IDs or a reusable query credential. | server wiring/session/router, client API, online UI, HTML referrer policy, browser/API tests | Retain cryptographic generation and fragment-to-session exchange; finish restart/artifact coverage and document unsupported rotation. | Format/uniqueness; invalid/malformed/cross-game/cross-seat; reuse/copy/reconnect/refresh; referrer/history/log/artifact checks. | Pending | `npm test -- src/server && npm run test:e2e` | IN PROGRESS |
| SEC-013 | Existing test proves only one opponent hand is redacted in one two-seat state. | Other private state or legal-action fields could cross seat boundaries. | engine state/projection tests, raw HTTP tests, security documentation | Inventory every canonical private field and add a role-by-field projection matrix without changing game logic. | Raw API assertions across 2/4/6 seats, foreign game, unauthenticated visitor, admin, and absent spectator role. | Pending | `npm test -- src/server && npm run test:e2e` | BLOCKED |
| SEC-010 | A random client-supplied reporter marker controls report lookup and legacy matching broadens access. | One browser can query another reporter's records and infer report content. | `src/client/api.ts`, `src/server/handlers.ts`, reporting UI/tests | Remove reporter-ID authorization; derive any player report access from the authenticated session, with reporting disabled by default. | Foreign identifier reveals nothing; cross-player retrieval fails; own minimal reports work only when enabled. | Pending | `npm test -- src/server` | BLOCKED |
| SEC-011 / KI-011 | Creation/report endpoints accept weakly shaped input; bodies have no explicit cap; errors can echo backend messages; retry semantics lack a revision. | Abuse can exhaust memory, replay actions, or disclose internal details while corrupting expectations about state. | Node/Pages body readers, router validators, client move API, tests | Enforce content type, byte/depth/field/string limits, strict schemas, expected-turn and idempotency semantics, and sanitized error mapping. | Malformed/empty/oversize/unknown/nested/stale/duplicate/raced/wrong-seat/failure/interruption/error-serialization cases. | Pending | `npm test -- src/server && npm run test:e2e` | BLOCKED |
| SEC-007 / KI-013 | Framework game reports duplicate full authoritative snapshots; standalone reports can upload full state; no retention/deletion policy exists. | Reports create a second indefinite store of hidden game data. | router/client/report UI/store wrapper or report feature configuration, docs/tests | Default reporting to disabled; if enabled, persist a bounded diagnostic-only shape, authenticate player access, enforce expiry and deletion. | No opponent hand/token in report; disabled sends nothing; own-only access; expiry and deletion; bounded input. | Pending | `npm test -- src/server && npm run test:e2e` | BLOCKED |
| SEC-008 / KI-007 | Vite, Vitest, and the React plugin are pinned to compatible patched majors; both full and production-only audits report zero findings locally. Hosted verification remains pending. | The seven prior development-tool findings are removed from the locked tree. | `package.json`, `package-lock.json`, `vitest.config.ts`, `vite.config.ts`, `docs/DEPENDENCY_AUDIT.md`, CI | Retain the compatibility-tested versions and run both documented audit targets in CI. | Clean install, full/production audit, unit, typecheck, both builds, and Playwright. | Pending | `npm ci && npm audit && npm audit --omit=dev && npm test && npm run typecheck && npm run build && npm run build:ui && npm run test:e2e` | IN PROGRESS |
| KI-009 | Generated version metadata is confined to ignored `dist-ui/version.json`; the obsolete tracked placeholder is removed. Local clean-worktree proof is pending commit and hosted verification. | Routine builds no longer alter tracked metadata; deterministic artifacts are compared across repeat builds. | `vite.config.ts`, `scripts/verify-clean-build.mjs`, tracked placeholder, CI | Keep generated metadata in ignored output and run the repeated-build clean-worktree verifier in CI. | Clean start; repeated builds; identical artifacts except documented `version.json`; `git status --porcelain` empty. | Pending | `npm run verify:clean-build` | IN PROGRESS |

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
