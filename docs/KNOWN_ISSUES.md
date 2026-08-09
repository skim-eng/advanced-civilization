# Known issues

## Phase 0 blockers

| ID | Status | Issue |
|---|---|---|
| KI-001 | Resolved | The `skim-eng/advanced-civilization` fork is configured as `origin`; the locked archive branch, protected annotated tag, Phase 0 branch, and pull request 1 are published. |
| KI-002 | Open | Upstream hub integrations send traffic to `games-hub-5vo.pages.dev` by default. They must be disabled or redirected before staging. |
| KI-003 | Open | Report-triage list and resolve routes lack administrator authentication and can expose full snapshots. |
| KI-004 | Open | Fresh Supabase schema lacks the framework's `identities` and `ranked_report` columns, which is expected to break production persistence. |
| KI-005 | Open | `GameServer.id()` uses `Math.random` for game IDs and bearer seat tokens. |
| KI-006 | Partially mitigated | Query-string bearer tokens remain visible and lack explicit referrer controls. Phase 1 confirmed a Vite proxy-error leak and added tested query-credential log redaction; non-Vite logs, browser artifacts, referrers, and token-to-session exchange remain open. |
| KI-007 | Open | Seven development dependency vulnerabilities remain intentionally unchanged in the baseline. Production-only audit reports zero. |

## Baseline quality and operability

| ID | Status | Issue |
|---|---|---|
| KI-008 | Open | The minified UI JavaScript bundle is 831.79 kB (249.61 kB gzip), triggering Vite's 500 kB warning. This is a performance observation, not a Phase 0 failure. |
| KI-009 | Open | `npm run build:ui` rewrites tracked `dummy-non-existing-folder/version.json` with the current SHA/time. Phase 0 restored the file; the build is not worktree-clean by itself. |
| KI-010 | Open | TypeScript `build` compiles test files and source maps into `dist`; `dist` is not the Pages artifact, but local server output is larger than necessary. |
| KI-011 | Open | The Node API and Pages Function do not apply request body-size limits in project code. |
| KI-012 | Open | With Realtime enabled, `OnlineGame` still polls every 2.5 seconds because it explicitly sets `pollMs: 2500`; service usage has not been measured. |
| KI-013 | Open | Reports persist independently of games; there is no documented retention/deletion implementation yet. |
| KI-014 | Open | Phase 0 used bundled Node 24.14.0. No system `node` or `npm` was present on PATH, so npm 11.6.2 was launched through the bundled pnpm runtime. |

## Not yet tested

Manual browser behavior, multi-context Playwright coverage, real-device behavior, Realtime, polling timing, restart persistence, Cloudflare Access, Supabase RLS in a live project, deployment, load/soak behavior, backups, and rollback are intentionally unverified until their authorized phases.
