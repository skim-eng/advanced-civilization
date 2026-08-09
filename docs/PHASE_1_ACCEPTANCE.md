# Phase 1 acceptance

Branch: `test/vanilla-multiplayer`  
Phase 0 merge: `31fad73503d91f8d4b8b5210e537cbd24ad81975`  
Local implementation checkpoint:
`c0ee66fa4b3cddd9b0c3b36647ac718c1be21f26`

## Current decision

**CONDITIONAL PASS pending final branch publication and a green GitHub Actions
run for the published Phase 1 HEAD.**

All `MUST_FIX_BEFORE_PHASE_1_COMPLETION` implementation and local acceptance
tests pass. The condition cannot be removed until the exact final branch HEAD
completes the hosted workflow. Phase 1 is not merged, and Phase 2 has not begun.

## Blocker disposition

| Issue | Original severity | Implementation | Acceptance test | Disposition |
|---|---|---|---|---|
| SEC-001 / KI-002 | High | `447d92c` | Default browser/server capture: zero unexpected egress | LOCAL PASS; HOSTED PENDING |
| SEC-002 / KI-003 | Critical | `132d5d8` | Disabled/anonymous/player/bad-admin/valid-admin matrix | LOCAL PASS; HOSTED PENDING |
| SEC-003 / KI-004 | Critical availability | `fd9f15a` | From-zero schema and full persistent lifecycle | LOCAL PASS; HOSTED PENDING |
| SEC-003-RLS | Critical confidentiality | `fd9f15a`, `171b839` | Browser-role CRUD denial, server lifecycle, artifact scan, state-free Realtime payload | LOCAL PASS; HOSTED PENDING |
| SEC-004 / SEC-005 / KI-005 / KI-006 | Critical/High | `56e6a41`, `c0ee66f` | Crypto IDs; invalid/cross-game; fragment/cookie; refresh/reconnect/restart; URL/history/referrer/log/console/artifact | LOCAL PASS; HOSTED PENDING |
| SEC-013 | High | `171b839`, `c0ee66f` | Canonical role matrix and raw 2/4/6 API responses | LOCAL PASS; HOSTED PENDING |
| SEC-010 | Medium | `132d5d8` | No reporter identity/lookup/UI; foreign identifier denied | LOCAL PASS; HOSTED PENDING |
| SEC-011 / KI-011 | Medium/High | `c2f2cae` | Bounded malformed/stale/duplicate/race/wrong-seat/failure matrix | LOCAL PASS; HOSTED PENDING |
| SEC-007 / KI-013 | High | `132d5d8`, `fd9f15a` | Reporting sends/stores zero; admin sanitized; legacy purge | LOCAL PASS; HOSTED PENDING |
| SEC-008 / KI-007 | High development exposure | `a33fccb` | Locked install; both audits zero; unit/type/build/UI/browser | LOCAL PASS; HOSTED PENDING |
| KI-009 | Reliability | `ef16365` | Repeat 156-artifact comparison and clean Git state | LOCAL PASS; HOSTED PENDING |

No item classified `MUST_FIX_BEFORE_PHASE_1_COMPLETION` was converted to an
accepted risk. Remaining deployment-only controls are listed below.

## Local gate evidence

At the implementation checkpoint, all commands exited 0:

- `npm ci`
- `npm audit` — zero vulnerabilities
- `npm audit --omit=dev` — zero vulnerabilities
- `npm test` — 19 files, 199 tests
- `npm run test:schema` — 1 lifecycle test
- `npm run test:rls` — 1 RLS test
- `npm run typecheck`
- `npm run build`
- `npm run build:ui`
- `npm run test:secrets`
- `npm run verify:clean-build` — 156 deterministic artifacts
- `npm run test:e2e` — 6 Playwright tests

## Explicit integrity confirmations

- No secret or generated credential file is committed.
- No proprietary VASSAL module, extracted board artwork, or board image is
  committed.
- Advanced Civilization rules, action legality, deterministic RNG, game data,
  map/play-area data, graphics, scoring, and normal gameplay are unchanged.
- Every Phase 1 deviation is recorded in `docs/VANILLA_DEVIATIONS.md`.
- No Cloudflare or hosted Supabase resource was created and no deployment ran.
- Phase 1 is not merged and Phase 2 has not begun.

## Remaining known limitations

- Invitation revocation/rotation is unsupported; copied invitations remain
  reusable by design.
- PGlite does not reproduce Supabase PostgREST or the hosted Realtime service;
  repeat these checks against a future owner-controlled project before
  deployment.
- Cloudflare Access, CSP/frame/HSTS/noindex, CORS/origin/rate limits, domain,
  backup/restore, and rollback are Phase 2 deployment gates.
- Physical mobile, cross-network, sleep/resume/network-switch, and load/soak
  tests were not available in local Phase 1.
- The UI bundle remains over Vite's warning threshold; optimization was outside
  the security/reliability scope.

These limitations are `MUST_FIX_BEFORE_PHASE_2_DEPLOYMENT` or documented
non-deployment observations. None permits deployment from Phase 1.

## Merge recommendation

Do not merge until the final hosted condition is removed. After a green Actions
run for the exact published HEAD, Phase 1 may be recommended ready to merge, but
must still be merged only by explicit owner action.
