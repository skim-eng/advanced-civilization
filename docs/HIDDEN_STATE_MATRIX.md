# Hidden-state projection matrix

Phase 1 treats the persisted `GameState`, game metadata, seats, messages, and
reports as server-side records. The browser receives game state only from an
authenticated `/api/games/:gameId` request after `adapter.viewFor` has produced
a seat-specific projection. There is no public or spectator route.

`[hidden]` is the documented non-sensitive replacement for a card whose
existence/count must remain observable while its identity must not. Empty
objects/arrays represent a role-scoped collection with no entries visible to
the receiving seat. `rngState: 0` is a non-random sentinel, not a usable RNG
state.

## Role-by-field matrix

| Canonical field or record | Player A | Player B / trade counterparty | Other player in same game | Player in another game | Unauthenticated visitor | Report administrator | Public / spectator |
|---|---|---|---|---|---|---|---|
| Own commodity cards and held calamities | Exact own values | Exact own values | Exact own values | No route access | No route access | No game-state access | Role does not exist |
| Other players' hands / legacy `calamities` | `{}` / `[]`; public `handCount` only | Same | Same | No route access | No route access | No game-state access | Role does not exist |
| Ordered undrawn `trade.stacks` | One `[hidden]` per card, preserving stack size | Same | Same | No route access | No route access | No game-state access | Role does not exist |
| Queued, unresolved `pendingCalamities` | Own identity; rivals' identities `[hidden]` | Same rule | Same rule | No route access | No route access | No game-state access | Role does not exist |
| Open offer `declared` and `wants` | Public announced values | Public announced values | Public announced values | No route access | No route access | No game-state access | Role does not exist |
| Open offer / response `actual` | Exact only when A authored that bundle | Exact only when B authored that bundle | Exact only for bundles authored by that seat | No route access | No route access | No game-state access | Role does not exist |
| Completed trade details | Exact for a trade involving A | Exact for a trade involving B | Trade omitted unless that seat participated | No route access | No route access | No game-state access | Role does not exist |
| Pending choice candidates, caps, areas, march, or partial faction | Exact only when that seat is the named chooser | Exact only when that seat is the named chooser | Redacted to empty candidates/caps/areas/factions | No route access | No route access | No game-state access | Role does not exist |
| Pending choice role/stage/count | Minimal role/stage metadata needed by `currentActor` and waiting UI | Same | Same | No route access | No route access | No game-state access | Role does not exist |
| Calamity resume snapshots / overview strings | Empty server-only representation | Same | Same | No route access | No route access | No game-state access | Role does not exist |
| Pending expansion caps / revolt map | Receiving seat's entry only | Receiving seat's entry only | Receiving seat's entry only | No route access | No route access | No game-state access | Role does not exist |
| `calamityTradedFrom` provenance | `{}` | `{}` | `{}` | No route access | No route access | No game-state access | Role does not exist |
| Serialized `rngState` | `0` sentinel | `0` sentinel | `0` sentinel | No route access | No route access | No game-state access | Role does not exist |
| Legal actions | Full actions only when that authenticated seat is on clock | Same rule | `[]` off clock | No route access | No route access | No game-state access | Role does not exist |
| Game event log and resolved combat/calamity events | Game-wide public outcomes; draw/trade events omit secret identities and actual bundles | Same | Same | No route access | No route access | No game-state access | Role does not exist |
| Game chat messages | Game-wide authenticated chat | Same | Same | No route access | No route access | No message access | Role does not exist |
| Direct/private messages | Feature does not exist | Feature does not exist | Feature does not exist | Feature does not exist | Feature does not exist | Feature does not exist | Feature does not exist |
| Seat and invitation credentials, email/AI/identity metadata | Never returned after invitation exchange | Same | Same | No route access | No route access | Not included in report output | Role does not exist |
| Reports and report snapshots | Player reporting and lookup disabled | Same | Same | No access | No access | Explicit default-off bearer boundary; sanitized metadata only, with snapshot/view/log/user-agent/game ID omitted | No access |
| Realtime | State-free `{turn}` or empty message signal; client refetches through authenticated projection | Same | Same | No subscribed state row | No subscribed state row | Not applicable | No public subscription |

Game chat is intentionally visible to every authenticated seat in that game; it
is not a private/direct-message facility. A future direct-message feature would
require a separate authorization design and projection tests.

## Enforcement and evidence

- `src/engine/projection.test.ts` inventories the canonical private fields and
  verifies chooser/participant projection without mutating canonical state.
- `src/server/multiplayer.test.ts` verifies raw API bodies and legal-action
  responses for every seat in 2-, 4-, and 6-player games, plus unauthenticated
  denial and absence of invitation credentials.
- `tests/e2e/vanilla-multiplayer.spec.ts` verifies missing/cross-game sessions,
  invitation exchange, browser isolation, and external-request blocking.
- `tests/rls/rls-policy.test.ts` verifies that browser database roles cannot read
  snapshots, tokens, messages, or reports directly.
- `scripts/check-browser-secrets.mjs` verifies that server-only names and canary
  values do not enter browser artifacts or source maps.

The framework broadcaster sends only a turn number after a move (or an empty
message notification). It never broadcasts game state; clients always refetch
the seat-specific API projection.
