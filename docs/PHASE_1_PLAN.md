# Phase 1 plan — local vanilla multiplayer validation and hardening

Branch: `test/vanilla-multiplayer`

Phase 0 merge commit: `31fad73503d91f8d4b8b5210e537cbd24ad81975`

## Progress

- Hosted GitHub Actions CI: complete and passing.
- Untouched local two-seat smoke test: complete and recorded.
- Vite proxy credential-log redaction: implemented with unit and process-level regression checks.
- Initial isolated-context Playwright suite: complete and passing locally and in GitHub Actions.
- Comprehensive security characterization and remediation: in progress; Phase 1 is not complete.

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
