# Multiplayer test results

## Phase 1 local acceptance candidate

- Date: 2026-08-09
- Branch: `test/vanilla-multiplayer`
- Tested implementation checkpoint:
  `c0ee66fa4b3cddd9b0c3b36647ac718c1be21f26`
- Phase 0 merge base: `31fad73503d91f8d4b8b5210e537cbd24ad81975`
- Runtime: bundled Node.js 24.14.0 and npm 11.6.2
- Browser: Playwright 1.62.1 Chromium, one worker, isolated context per seat
- Topology: loopback Vite + Node API; isolated filesystem/PGlite stores
- External services/secrets: none; no Cloudflare or hosted Supabase

Every command below exited 0 from a clean worktree:

| Command | Result |
|---|---|
| `npm ci` | 90 packages installed; 91 audited |
| `npm audit` | 0 vulnerabilities |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npm test` | 19 files; **199/199** tests passed |
| `npm run test:schema` | 1 file; **1/1** lifecycle test passed |
| `npm run test:rls` | 1 file; **1/1** RLS test passed |
| `npm run typecheck` | PASS |
| `npm run build` | PASS; 154 local server/library files, about 2.3 MiB |
| `npm run build:ui` | PASS; main JS 1,031.88 kB raw / 295.44 kB gzip |
| `npm run test:secrets` | PASS; 8 forbidden server names/canary values checked in every browser artifact/source map |
| `npm run verify:clean-build` | PASS; 156 deterministic artifacts matched across repeats; ignored `version.json` excluded; Git remained clean |
| `npm run test:e2e` | **6/6** Playwright tests passed in 10.4 seconds |

## Required 24-case matrix

| # | Result | Concrete evidence |
|---:|---|---|
| 1 | PASS | 2-player Italy/Africa browser and raw API games created. |
| 2 | PASS | 4-player Egypt/Babylon/Assyria/Asia game opened in four contexts. |
| 3 | PASS | 6-player Africa/Italy/Illyria/Thrace/Crete/Asia game opened in six contexts. |
| 4 | PASS | Every 2/4/6 invitation and extracted credential was distinct. |
| 5 | PASS | Every context/API body returned the expected civilization identity. |
| 6 | PASS | Missing and malformed credentials returned only authentication errors. |
| 7 | PASS | A game-A credential failed against game-B fetch/legal/move/message/report routes. |
| 8 | PASS | Server token-map authentication fixed each credential to one seat; no client seat selector exists. |
| 9 | PASS | On-clock seat submitted a legal pass and committed one new turn. |
| 10 | PASS | Off-clock seat received 403 and did not mutate state. |
| 11 | PASS | Refresh preserved seat, cookie, and authoritative revision. |
| 12 | PASS | A copied invite reconnected the correct seat in a fresh isolated context. |
| 13 | PASS | New filesystem store/server/session instances reopened, reconnected, and continued the committed game. |
| 14 | PASS | With Realtime unset, the waiting browser observed the move through polling within 5.5 seconds. |
| 15 | PASS (local contract) | Enabled local Supabase broadcaster capture sent exactly `{turn}` for moves and `{}` for messages, never state. Hosted service repetition remains Phase 2. |
| 16 | PASS | Canonical inventory and every raw 2/4/6 seat response omitted opponent/private values. |
| 17 | PASS | Unauthenticated game response was 401 with no state. |
| 18 | PASS | Two simultaneous same-turn requests produced exactly one 200 and one rejection. |
| 19 | PASS | Duplicate request/revision returned 409; committed turn advanced once. |
| 20 | PASS | Three successive refreshes in both 4- and 6-seat cases preserved the turn. |
| 21 | PASS | All contexts recorded zero unexpected external requests. |
| 22 | PASS | URL/history/referrer/cookie/log/console/artifact/report controls revealed no credential; trace/screenshot/video were disabled. |
| 23 | PASS | Injected database failure returned fixed 503 without the canary secret and preserved the last commit. |
| 24 | PASS | Filesystem, Playwright, schema, and RLS stores used unique directories with guarded teardown. |

The hidden-state role/field results are detailed in
`docs/HIDDEN_STATE_MATRIX.md`. Request-negative cases are detailed in
`docs/API_SECURITY.md`; migration/RLS lifecycle evidence is detailed in
`docs/SCHEMA_MIGRATIONS.md`.

## Browser test names

1. `isolates two browser seats and observes polling after a legal move`
2. `creates isolated 4- and 6-player browser sessions with distinct credentials and identities`
3. `rejects missing, malformed, and cross-game seat credentials on protected routes`
4. `exchanges a copied invitation into a refreshable HttpOnly session without URL, history, or referrer leakage`
5. `rejects malformed, oversized, unsupported, stale, duplicate, and wrong-player requests without mutation`
6. `accepts exactly one of two simultaneous submissions for the same turn`

No Playwright trace, screenshot, or video is retained. The test suite does not
print invitation URLs, game IDs, credentials, private hands, or full snapshots.

## Hosted history

- CI foundation `f54def08a5c36e859836f48e331909c9068ef5f5`, run
  `31314327823`: original 174 tests, typecheck, both builds passed.
- Initial Playwright `dc6c87e6e99c9460c37fe8ebf79a85f56aac7f49`, run
  `31315830155`: 176 unit tests and 3 browser/API tests passed.
- Published checkpoint `8689ec4b4ad26813e451be6df4bb45d683c8101d`, run
  `31315912882`: green intermediate checkpoint.
- Final Phase 1 HEAD: pending publication and hosted CI; intermediate runs are
  not acceptance.

## Manual and deferred evidence

The locally available manual desktop record is in
`docs/MANUAL_MULTIPLAYER_TEST.md`. Physical mobile/cross-network tests, hosted
PostgREST/Realtime, Cloudflare Access/headers/domain, backup/rollback, and
load/soak were not run because Phase 1 prohibits provisioning or deployment.
They remain explicit Phase 2 gates.

## Vanilla integrity

The Phase 1 diff changes no file under `src/data`, no map/graphics/artwork, and no
rules/action/scoring implementation. The only engine diff is the outbound
`viewFor` redaction. Seeded canonical state and gameplay behavior are unchanged.
