# Vanilla deviations

This file records every Project Chronicle change that can differ from John Champaign's baseline at `4b3f981cdf4b3cefbb8f523b0d78c9eb320e1422`.

## Phase 0

| Area | Change | Gameplay effect |
|---|---|---|
| Secret hygiene | Expanded `.gitignore` to cover `.env.*` (except `.env.example`), `.dev.vars.*`, `.wrangler/`, common credential exports, and private-key formats. | None. |
| Project governance | Added `AGENTS.md` and the Phase 0 engineering documentation under `docs/`. | None. |

No engine, rules, game data, UI behavior, server behavior, dependency version, or deployment behavior was changed in Phase 0.

The build-generated change to `dummy-non-existing-folder/version.json` was restored to the exact upstream content and is not a deviation.

## Phase 1

| Area | Change | Gameplay effect |
|---|---|---|
| Continuous integration | Added a GitHub Actions workflow that runs `npm ci`, `npm test`, `npm run typecheck`, `npm run build`, and `npm run build:ui` on pushes and pull requests with Node.js 24. | None. |
| Development log hygiene | Redact seat and service credential query values from Vite development log messages, including proxy errors. | None. |
| Browser test harness | Added Playwright 1.62.1 with isolated seat contexts, external-network blocking, sanitized artifacts, temporary persistence, and API concurrency/authorization coverage. | None. |
| Upstream integrations | Removed default upstream splash/cross-promotion/identity/leaderboard/counter behavior; optional server integrations require explicit flags and owner-controlled URLs. | None; local and online vanilla play remain available. |
| Development dependencies | Pinned compatibility-tested Vite 8.2.1, Vitest 4.1.10, and React plugin 6.0.5; added explicit source-only Vitest discovery. | None; build/test tooling only. |
| Build metadata | Removed the tracked generated placeholder and confined version metadata to ignored `dist-ui/version.json`; CI compares repeat artifacts and clean Git state. | None. |
| Multiplayer authentication | Replaced framework-default random IDs and query-string seat tokens in Node/Pages wiring with Web Crypto IDs and a fragment-to-encrypted-HttpOnly-session exchange. | No rules or legal-action effect; only invitation and HTTP authentication transport changes. |
| Reporting boundary | Disabled player/standalone reporting and automatic crash uploads; removed client reporter-ID lookup; made sanitized legacy triage explicitly opt-in behind a separate server-only bearer. | None; reporting and diagnostics only. |
| API request integrity | Added strict body/shape limits, safe error serialization, expected-turn checks, and random request IDs for network moves. | No action legality or rules effect; stale/duplicate transport requests now fail before a second transition. |
| Database reproducibility | Replaced the drifted schema snapshot with an ordered framework-0.42-compatible migration and added isolated PostgreSQL lifecycle/RLS/browser-secret tests. | None; persistence schema and test infrastructure only. |
| Hidden-state projection | Redacted ordered deck identities, RNG state, calamity provenance, resume metadata, non-owner pending choices, and per-seat expansion/revolt data in addition to upstream hand/offer redaction. | None to canonical state, action legality, deterministic RNG, or outcomes; transport projection only. |
| Realtime verification | Added a wire-contract test proving optional move/message broadcasts contain only a turn number or empty signal. | None. |
| Multiplayer coverage | Expanded raw API and isolated-browser coverage to every seat in 2-, 4-, and 6-player games, restart/reconnect, refresh, malformed/stale/duplicate/race/failure, and cleanup cases. | None; tests only. |

Phase 1 changes no rules, actions, legality, map/play-area data, civilization,
commodity, advance, calamity, scoring, graphics, or normal gameplay outcome. The
only engine-file change is the server-facing `viewFor` projection. No deployment
or service provisioning is included.

## Phase 2

| Area | Change | Gameplay effect |
|---|---|---|
| Deployment response policy | Added root Pages middleware for CSP, HSTS, no-referrer, nosniff, DENY/frame-ancestors, Permissions-Policy, noindex/noarchive, and API no-store; added `robots.txt`. | None. |
| Origin boundary | Removed the Pages wildcard CORS preflight and reject browser writes whose `Origin` differs from the exact application origin. | None; transport security only. |
| Cloudflare packaging | Renamed the Wrangler project to `kimsvideo-civ-vanilla`, compiled Functions, stored server secrets encrypted, selected fail-closed behavior, and deployed behind production-alias plus wildcard-preview Access. | None; hosting and access control only. |
| Hosted verification | Added hosted Playwright configuration, Realtime evidence, targeted cleanup, deployment artifact/IP scanners, and a same-origin intercepted referrer probe compatible with the staging CSP. | None; tests and operations only. |
| Supabase staging | Applied the unchanged Phase 1 ordered migration to a dedicated owner project and verified RLS/PostgREST/service-role/Realtime boundaries. | None; persistence provider only. |
| Provider credential lifecycle | Rotated the Pages database secret to the current Supabase key path and revoked the inspected legacy signing key; removed all temporary Access test credentials after validation. | None; credential hygiene only. |

No Phase 2 change alters rules, actions, legality, map/game data, graphics,
scoring, deterministic RNG, or normal vanilla gameplay.
