# Vanilla multiplayer test plan

Status: planned for Phases 1 and 2; only the existing Phase 0 Vitest evidence has been executed.

## Test principles

- Start from the accepted vanilla baseline and keep gameplay rules unchanged.
- Use deterministic seeds and unique temporary persistence per test.
- Give every player a separate Playwright browser context; never simulate seat isolation with tabs sharing storage.
- Assert authorization and redaction against raw HTTP responses, not only UI visibility.
- Never print or attach full invitation URLs, bearer tokens, service keys, private hands, or full report snapshots to CI logs or screenshots.
- Run local tests without production secrets. Run Realtime tests only against an owner-controlled test Supabase project.
- Record the tested commit SHA, Node/npm/browser versions, command exit codes, request timing, console errors, and network errors.

## Phase 1 browser cases

| ID | Case | Required assertion/evidence |
|---|---|---|
| MP-001 | Two-player game creation | Lobby returns one game ID and two non-empty distinct invitations. |
| MP-002 | Invitation separation | Sanitized evidence confirms each seat has a different bearer token without recording either token. |
| MP-003 | Seat A link | Fresh context opens Seat A and raw response identifies Seat A. |
| MP-004 | Seat B link | Separate fresh context opens Seat B and raw response identifies Seat B. |
| MP-005 | Civilization identity | Each UI and raw response shows only the correct `you` identity. |
| MP-006 | Malformed token | Server returns an authentication error and no state. |
| MP-007 | Cross-game isolation | A valid token from game A cannot fetch, move, report, or read messages in game B. |
| MP-008 | Legal move | On-clock player submits a deterministic legal action and a new snapshot persists. |
| MP-009 | Off-clock move | Server rejects it; client-side disabled controls are not accepted as evidence. |
| MP-010 | Refresh persistence | Refresh retains the same seat and committed state. |
| MP-011 | Fresh-context reconnect | A new isolated context with the same invitation reconnects to the correct seat. |
| MP-012 | Raw hidden-state projection | Response lacks every opponent private hand/card, pending actual offer/response, secret calamity, private completed deal, and private message field. |
| MP-013 | Server-level redaction | Deliberately inspect JSON and prove absence or explicit redaction; do not use CSS/UI assertions alone. |
| MP-014 | Polling fallback | With Realtime variables absent/blocked, waiting context updates through polling; measure interval and latency. |
| MP-015 | Realtime refresh | With owner-controlled Realtime configured, a turn-only broadcast causes a redacted refetch; capture payload shape and latency. |
| MP-016 | Four players | Four isolated contexts join distinct seats and preserve identity/redaction. |
| MP-017 | Six players | Six isolated contexts join distinct seats and preserve identity/redaction. |
| MP-018 | Near-simultaneous submissions | Race two requests for the same turn; exactly one snapshot succeeds and the other returns conflict/stale rejection. |
| MP-019 | Repeated refresh | Burst normal refresh/reconnect cycles without duplicate turns or corrupted snapshots. |
| MP-020 | Artifact leakage | Sanitized inspection finds no seat token, service key, opponent hand, or secret offer in console, public logs, screenshots, `dist-ui`, source maps, or error reports. |

## Additional API and failure cases

| ID | Boundary | Required test |
|---|---|---|
| API-001 | Cryptographic IDs | Inject/use secure ID generation; assert format, uniqueness, and absence of `Math.random` fallback in both Node and Pages wiring. |
| API-002 | Token authorization | Exercise fetch, legal, move, chat, report, history, and deletion with valid, missing, malformed, and wrong-game tokens. |
| API-003 | Move ownership | Parameterized actions must pass authoritative `tryApplyAction`; UI state cannot bypass it. |
| API-004 | State persistence | Restart API process and reconnect; verify exact latest turn and redacted response. |
| API-005 | Hidden projections | Construct fixtures covering all private fields, offers/responses, calamities, completed deals, logs, and future state additions. |
| API-006 | Report submission | Validate authentication, body types/sizes, persistence failure, redacted confirmation, retention behavior, and disabled mode. |
| API-007 | Report administration | Public callers cannot list full reports or resolve them; administrator boundary has positive and negative tests. |
| API-008 | Malformed JSON | Node and Pages handlers return controlled 4xx responses without stack, token, or secret leakage. |
| API-009 | Unexpected actions | `null`, primitives, missing action, unknown type, oversized structures, and invalid nested fields are rejected without mutation. |
| API-010 | Duplicate requests | Identical or concurrent submissions cannot apply the same turn twice. |
| API-011 | Stale clients | A client acting from an obsolete turn receives conflict/rejection and refetches current truth. |
| API-012 | Database failures | Timeouts, missing table/column, network failure, and duplicate writes produce safe status codes and no secret-bearing error. |
| API-013 | Email disabled | No Resend request occurs and gameplay remains functional when `RESEND_API_KEY` is absent. |
| API-014 | Realtime disabled | No Supabase client/broadcast is required; polling keeps the game usable. |
| API-015 | Supabase RLS | Anon key cannot select any `dbf_*` row; service role works only server-side. |
| API-016 | Realtime confidentiality | An unauthorized subscriber receives no state; authorized clients receive only turn/message signals and refetch via token-gated HTTP. |
| API-017 | Upstream network isolation | Browser and server request logs contain no `games-hub-5vo.pages.dev` traffic under staging defaults. |
| API-018 | Referrer protection | Navigation from a token-bearing URL sends no referrer to an unrelated origin. |
| API-019 | CORS/access gate | Unauthorized origins/visitors cannot create games or call protected APIs; Cloudflare Access covers Functions as well as SPA. |
| API-020 | Schema-from-zero | Apply reviewed SQL to a fresh project/database and complete create/fetch/move/report/message flows. |

## Manual browser and device plan

Phase 1 will create `docs/MANUAL_MULTIPLAYER_TEST.md` with step-by-step checks using a laptop browser for Player 1, private/incognito or a second laptop for Player 2, iPhone Safari, and Android Chrome when available. It will cover same-network and different-network joining, turns, refresh, sleep/resume, network switching, invite copy, tab closure, stale state, continuation, and private-information separation.

## Phase 2 deployed acceptance subset

Against both the default Pages URL and `https://civ-vanilla.kimsvideo.org`, repeat access-gate, 2/4/6-player creation, distinct seats, identity, invalid/cross-game tokens, redaction, legal/stale moves, refresh, fresh-browser reconnect, Realtime, polling fallback, database survival across deploys, service-key bundle scans, board-art absence, upstream-traffic absence, and owner-controlled report storage.

## Limited load/soak approach

- Create 10 concurrent games with a mix up to 6 seats, using deterministic seeds.
- Model normal 2.5-second polling first; adjust only after measuring Realtime behavior.
- Submit representative legal turns, disconnect/reconnect clients, and interrupt some pollers.
- Capture request count, status distribution, latency, Supabase query/broadcast behavior, approximate quota use, and cleanup procedure.
- Stay within free-tier and provider policies. Report only measured capacity, never extrapolated claims.
