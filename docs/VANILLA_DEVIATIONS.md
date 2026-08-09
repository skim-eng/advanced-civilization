# Vanilla deviations

This file records every Project Chronicle change that can differ from John Champaign's baseline at `4b3f981cdf4b3cefbb8f523b0d78c9eb320e1422`.

## Phase 0

| Area | Change | Gameplay effect |
|---|---|---|
| Secret hygiene | Expanded `.gitignore` to cover `.env.*` (except `.env.example`), `.dev.vars.*`, `.wrangler/`, common credential exports, and private-key formats. | None. |
| Project governance | Added `AGENTS.md` and the Phase 0 engineering documentation under `docs/`. | None. |

No engine, rules, game data, UI behavior, server behavior, dependency version, or deployment behavior was changed in Phase 0.

The build-generated change to `dummy-non-existing-folder/version.json` was restored to the exact upstream content and is not a deviation.

## Required before staging, not yet implemented

The baseline audit found upstream integrations and security boundaries that must be disabled, feature-flagged, or repaired before a private staging deployment. Those future changes are listed in `docs/SECURITY_NOTES.md` and must be added here when implemented. They are not silently treated as completed Phase 0 work.

## Phase 1

| Area | Change | Gameplay effect |
|---|---|---|
| Continuous integration | Added a GitHub Actions workflow that runs `npm ci`, `npm test`, `npm run typecheck`, `npm run build`, and `npm run build:ui` on pushes and pull requests with Node.js 24. | None. |
| Development log hygiene | Redact seat and service credential query values from Vite development log messages, including proxy errors. | None. |
| Browser test harness | Added Playwright 1.62.1 with isolated seat contexts, external-network blocking, sanitized artifacts, temporary persistence, and API concurrency/authorization coverage. | None. |

No Playwright, deployment, service provisioning, rules, map data, graphics, or gameplay change is included in this initial Phase 1 commit.
