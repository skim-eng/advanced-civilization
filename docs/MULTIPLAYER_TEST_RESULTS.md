# Multiplayer test results

## Current status

Phase 1 has **not** begun. This document records only multiplayer evidence actually executed during the untouched Phase 0 baseline. No Playwright, manual-browser, Realtime, real-device, deployment, or load result is claimed here.

## Phase 0 environment

- Date: 2026-08-09
- Baseline SHA: `4b3f981cdf4b3cefbb8f523b0d78c9eb320e1422`
- Node: 24.14.0
- npm: 11.6.2
- Test runner: Vitest 2.1.9
- Persistence used by existing multiplayer suite: isolated temporary filesystem directories
- Simulated players per tested game: 2
- Browsers: none

## Existing upstream multiplayer suite

Command: npm 11.6.2 `test` via the launcher documented in `VANILLA_BASELINE_REPORT.md`.

Result: **9/9 multiplayer tests passed** within the full **174/174** passing suite.

| Existing test | Result | What it proves |
|---|---|---|
| Distinct secret token per seat | PASS | A two-player game receives non-empty, unequal seat tokens. |
| Seat authentication and bad-token rejection | PASS | Each valid token maps to its seat; a bogus token throws. |
| Turn ownership | PASS | Off-clock `pass` is rejected; on-clock `pass` succeeds. |
| Persistence and opponent-hand redaction | PASS | AI drives the game to trade; Egypt sees its own hand while Babylon's view of Egypt has an empty hand. |
| Authenticated report storage | PASS | Report contains full snapshot and client log and can be retrieved by category through server methods. |
| Category filter | PASS | The project router's triage list respects category. This is functional evidence, not security approval. |
| App ID filter | PASS | Server-stamped report app IDs can filter shared queues. This is functional evidence, not security approval. |
| Bad-token report rejection | PASS | Online report submission rejects a bogus token. |
| Move persistence across fetches | PASS | A submitted move remains visible in a later fetch. |

The suite reported one slow path: the hand-redaction scenario took approximately 519 ms. No console or network capture exists because the test runs directly against `GameServer`, not a browser or live HTTP server.

## Phase 1 required cases — not yet run

| Required case | Status |
|---|---|
| Two-player lobby and isolated browser contexts | NOT RUN |
| Four-player game and four contexts | NOT RUN |
| Six-player game and six contexts | NOT RUN |
| Invite-to-seat correctness and civilization identity | NOT RUN |
| Malformed token and cross-game token rejection over raw HTTP | NOT RUN |
| Server rejection of off-clock and stale moves over raw HTTP | NOT RUN |
| Refresh/reconnect from fresh contexts | NOT RUN |
| Comprehensive raw-response hidden-field absence | NOT RUN |
| Polling with Realtime unavailable | NOT RUN |
| Realtime refresh against configured Supabase | NOT RUN |
| Near-simultaneous duplicate submission | NOT RUN |
| Repeated-refresh corruption test | NOT RUN |
| Console/log/screenshot/source-map token and secret scan | NOT RUN |
| Malformed JSON/action/report and database-failure paths | NOT RUN |
| Manual laptop/iPhone/Android checks | NOT RUN |
| Deployed staging suite and soak/load test | NOT RUN |

## Known security limitations affecting later tests

SEC-001 through SEC-006 and SEC-013 in `SECURITY_NOTES.md` are blockers. In particular, existing tests do not make the unauthenticated report-triage routes safe, do not correct the Supabase schema, do not make `Math.random` tokens secure, and do not stop upstream hub traffic.
