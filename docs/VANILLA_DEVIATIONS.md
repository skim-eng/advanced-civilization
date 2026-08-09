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
