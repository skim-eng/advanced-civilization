# Multiplayer test results

## Current status

Phase 1 began on `test/vanilla-multiplayer` after Phase 0 merged at `31fad73503d91f8d4b8b5210e537cbd24ad81975`. Hosted CI, a sanitized untouched-local smoke test, Vite credential-log redaction, and the first isolated-context Playwright suite have passed. No Realtime, real-device, deployment, or load result is claimed yet.

## Phase 1 CI foundation

- Tested commit: `f54def08a5c36e859836f48e331909c9068ef5f5`
- GitHub Actions run: `31314327823`
- Runner: `ubuntu-latest`; application runtime: Node.js 24
- Result: **PASS** in 27 seconds with no annotations
- Steps passed: `npm ci`, `npm test` (174/174), `npm run typecheck`, `npm run build`, and `npm run build:ui`
- The workflow performs no deployment and has read-only repository permissions.

## Phase 1 untouched local smoke test

- Date: 2026-08-09
- Tested commit: `f54def08a5c36e859836f48e331909c9068ef5f5`
- Topology: Vite on loopback port 5173 proxying to the Node API on port 8787
- Persistence: unique temporary filesystem directory; no Supabase, Realtime, Resend, or production credentials
- Browser method: two in-app browser tabs; this is not yet the required isolated-context Playwright proof
- Evidence is sanitized: no game ID, invitation URL, or seat token is recorded here.

| Case | Result | Evidence |
|---|---|---|
| MP-001 two-player creation | PASS | UI created one game with two seats. |
| MP-002 distinct invitations | PASS | Both invitations were non-empty and unequal; values were not retained in the record. |
| MP-003/004 seat links | PARTIAL PASS | Separate tabs rendered Italy and Africa correctly; storage isolation awaits Playwright contexts. |
| MP-005 seat identity | PASS | Each UI reported the expected `you` civilization; authenticated raw fetch returned 200. |
| MP-006 malformed token | PASS | Raw fetch returned 401 and no state was retained. |
| MP-007 cross-game isolation | PARTIAL PASS | A seat token from game A could not fetch game B (401); move/report/message permutations remain pending. |
| MP-008 legal move | PASS | The on-clock Africa seat passed Ship Construction; a second snapshot persisted. |
| MP-010 refresh persistence | PASS | Refresh retained the Italy seat and current authoritative turn. |
| MP-011 reconnect/restart | PASS | After stopping and restarting the API with the same isolated store, authenticated fetch returned 200 and the browser restored the same seat/turn. |
| MP-014 polling fallback | PASS | With Realtime variables absent, the waiting Italy tab observed Africa's move within a 3.2-second observation window. |
| API-008 malformed JSON | PASS | Malformed JSON game creation returned controlled HTTP 400. |

Observed baseline defects were preserved as evidence: the first-session UI rendered upstream-controlled cross-promotion, identity/leaderboard integration remained active, bearer credentials remained in visible URLs, and both tabs shared the same browser-local anonymous identity. These are not accepted as staging-safe behavior.

## Phase 1 Playwright foundation

- Tested commit: `dc6c87e6e99c9460c37fe8ebf79a85f56aac7f49`
- GitHub Actions run: `31315830155`
- Playwright: 1.62.1; Chromium-only initial project
- Result: **3/3 browser/API tests passed** locally and on `ubuntu-latest`; the complete hosted job passed in 1 minute 10 seconds.
- Hosted prerequisites also passed: clean install, **176/176** Vitest tests, typecheck, server build, and UI build.
- Seat A and Seat B run in distinct browser contexts. External traffic is blocked by the test harness. Traces, screenshots, and video are disabled so token-bearing pages cannot enter artifacts. Each run uses and deletes a unique temporary filesystem store.

| Automated case | Result | Boundary proved |
|---|---|---|
| Two isolated seats + legal move + polling | PASS | Italy and Africa render in separate contexts; exactly one on-clock seat acts; the waiting context observes the next turn. |
| Missing/malformed/cross-game credentials | PASS | Missing and malformed credentials fail; a game-A credential receives 401 from game-B fetch, legal, move, message-read, message-write, and report routes. |
| Simultaneous duplicate submission | PASS | Two same-seat submissions raced for one turn; exactly one returned 200 and the other was rejected. |

This suite is an initial authorization/concurrency foundation, not comprehensive hidden-state approval. Full private-field projection fixtures, report-admin authorization, default-off external services, URL/referrer controls, schema/RLS, and malformed/oversized body coverage remain open.

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

## Remaining Phase 1 required cases

| Required case | Status |
|---|---|
| Two-player lobby and isolated browser contexts | PASS — isolated Playwright contexts |
| Four-player game and four contexts | NOT RUN |
| Six-player game and six contexts | NOT RUN |
| Invite-to-seat correctness and civilization identity | PASS for two players; 4/6-player matrices pending |
| Malformed token and cross-game token rejection over raw HTTP | PASS for fetch/legal/move/messages/report; future protected routes must join the matrix |
| Server rejection of off-clock and stale moves over raw HTTP | NOT RUN |
| Refresh/reconnect from fresh contexts | PARTIAL — refresh and API restart passed; fresh isolated context pending |
| Comprehensive raw-response hidden-field absence | NOT RUN |
| Polling with Realtime unavailable | PASS for initial two-seat Playwright case; repeated timing/soak pending |
| Realtime refresh against configured Supabase | NOT RUN |
| Near-simultaneous duplicate submission | PASS for one same-turn Playwright API race; broader stale/retry cases pending |
| Repeated-refresh corruption test | NOT RUN |
| Console/log/screenshot/source-map token and secret scan | PARTIAL — confirmed and fixed Vite proxy-log leak; Playwright artifacts disabled; broader scan pending |
| Malformed JSON/action/report and database-failure paths | NOT RUN |
| Manual laptop/iPhone/Android checks | NOT RUN |
| Deployed staging suite and soak/load test | NOT RUN |

## Known security limitations affecting later tests

SEC-001 through SEC-006 and SEC-013 in `SECURITY_NOTES.md` are blockers. In particular, existing tests do not make the unauthenticated report-triage routes safe, do not correct the Supabase schema, do not make `Math.random` tokens secure, and do not stop upstream hub traffic.
