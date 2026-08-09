# Vanilla baseline report

## Result: CONDITIONAL PASS

The exact upstream code installs, passes all 174 automated tests, typechecks, and completes both production builds. Its history, local archival branch, and annotated baseline tag are preserved. The architecture, IP boundary, data flow, environment variables, outbound services, and security boundaries are documented.

Phase 0 is **conditional**, not complete, because:

1. an owner-controlled GitHub fork does not currently exist publicly and no authenticated GitHub session is available, so `origin`, remote branch/tag protection, pushes, and the pull request remain blocked;
2. critical staging findings remain unresolved by design in this audit phase, including upstream hub traffic, unauthenticated report triage, incompatible Supabase schema, and non-cryptographic bearer-token generation.

Do not begin Phase 1 until the GitHub preservation/publishing items are completed and the project owner accepts this report.

## Provenance and preservation

| Item | Recorded value |
|---|---|
| Upstream repository | `https://github.com/johnchampaign/advanced-civilization.git` |
| Upstream GitHub identity | Public repository, `fork: false`, owned by `johnchampaign` |
| Upstream default branch | `main` |
| Exact baseline SHA | `4b3f981cdf4b3cefbb8f523b0d78c9eb320e1422` |
| Commit summary | `Movement/marker/tooltip fixes from the report queue` |
| Commit timestamp | `2026-07-22T05:22:42-04:00` |
| Local phase branch | `chore/vanilla-baseline` |
| Local archival branch | `archive/john-vanilla` at the exact baseline SHA |
| Annotated tag | `john-vanilla-2026-08-09-4b3f981` targeting the exact baseline SHA |
| License | MIT; `Copyright (c) 2026 John Champaign` retained unchanged |

The workspace began as an empty Git repository with no commits or remotes. John Champaign's repository was added as `upstream`, all advertised branches and tags were fetched, and local branches were created directly from `upstream/main`. No upstream commit was rewritten or squashed.

GitHub's public API reported zero forks at audit time. Both the in-app browser and connected Chrome session were signed out, and GitHub CLI is not installed. Therefore an owner fork could not be created or confirmed. `origin` is deliberately absent rather than falsely pointing it at John Champaign's repository.

### Exact Git commands used

```sh
git remote add upstream https://github.com/johnchampaign/advanced-civilization.git
git fetch upstream --prune --tags
git checkout -B main upstream/main
git branch --set-upstream-to=upstream/main main
git branch archive/john-vanilla upstream/main
git tag -a john-vanilla-2026-08-09-4b3f981 4b3f981cdf4b3cefbb8f523b0d78c9eb320e1422 \
  -m "Immutable John Champaign vanilla baseline at 4b3f981cdf4b3cefbb8f523b0d78c9eb320e1422"
git switch -c chore/vanilla-baseline
```

The tag is annotated and locally points to the correct commit. True immutability and archival-branch protection require publishing to the owner's fork and applying GitHub rules; local Git refs alone are movable.

## Baseline environment

| Tool | Version/condition |
|---|---|
| Platform | macOS, arm64 workspace |
| Node.js | `v24.14.0` from the Codex bundled runtime |
| npm | `11.6.2` |
| npm launcher | bundled `pnpm 11.16.0` via `pnpm dlx npm@11.6.2` because no system `node` or `npm` was on PATH |
| Git worktree before install | Clean at the exact upstream SHA |

The current npm 12.0.2 package warned that it requires Node `^24.15.0` or newer, so it was not used. npm 11.6.2 was selected as a compatible npm CLI without changing repository dependencies.

For every npm command below, the exact launcher prefix was:

```sh
RUNTIME_NODE_BIN=/Users/stephenkim/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin
FALLBACK_BIN=/Users/stephenkim/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback
PATH="$RUNTIME_NODE_BIN:$FALLBACK_BIN:$PATH" pnpm --silent dlx npm@11.6.2
```

The requested npm subcommand followed that prefix. This is materially the npm 11.6.2 CLI executing `ci`, `test`, and `run`; it is disclosed because the literal `npm` executable was absent from the host PATH.

## Installation and verification results

| Requested command | Actual npm CLI invocation suffix | Exit | Observed result |
|---|---|---:|---|
| `npm ci` | `ci` | 0 | Added 129 packages and audited 130 in about 2 seconds; 19 packages requested funding; reported 7 vulnerabilities. No dependency was updated. |
| `npm test` | `test` | 0 | Vitest 2.1.9: 12/12 test files passed; 174/174 tests passed; reported duration 2.10 s. |
| `npm run typecheck` | `run typecheck` | 0 | TypeScript completed with no diagnostics. |
| `npm run build` | `run build` | 0 | `tsc -p tsconfig.json` completed; measured `dist/` size was about 2.1 MiB. |
| `npm run build:ui` | `run build:ui` | 0 | Vite 5.4.21 transformed 133 modules and completed in 1.03 s. |
| `npm audit --json` | `audit --json` | 1 | 7 findings: 3 moderate, 3 high, 1 critical. |
| `npm audit --omit=dev --json` | `audit --omit=dev --json` | 0 | 0 production dependency findings. |

### Test counts

| Suite | Tests |
|---|---:|
| `src/engine/ast.test.ts` | 11 |
| `src/engine/ships.test.ts` | 12 |
| `src/engine/trade.test.ts` | 6 |
| `src/engine/calamity.test.ts` | 43 |
| `src/engine/playarea.test.ts` | 14 |
| `src/engine/combat.test.ts` | 9 |
| `src/engine/surplus.test.ts` | 4 |
| `src/engine/neutral.test.ts` | 5 |
| `src/engine/delivery.test.ts` | 8 |
| `src/server/multiplayer.test.ts` | 9 |
| `src/engine/engine.test.ts` | 46 |
| `src/ai/heuristic.test.ts` | 7 |
| **Total** | **174** |

### UI production bundle

| Artifact | Minified | Gzip |
|---|---:|---:|
| `dist-ui/index.html` | 2.14 kB | 0.90 kB |
| `dist-ui/assets/index-CzjqDBxt.js` | 831.79 kB | 249.61 kB |

Vite warned that a chunk exceeded 500 kB and suggested dynamic import or manual chunking. No source maps were emitted into `dist-ui` by the observed build.

The UI build rewrote tracked `dummy-non-existing-folder/version.json` with the build SHA and current time. The file was restored to its exact upstream content. This makes the build successful but not intrinsically worktree-clean; KI-009 tracks it.

## Direct dependency versions installed from the lockfile

| Dependency | Exact installed version |
|---|---:|
| `@supabase/supabase-js` | 2.108.2 |
| `@types/node` | 22.20.0 |
| `@types/react` | 19.2.17 |
| `@types/react-dom` | 19.2.3 |
| `@vitejs/plugin-react` | 4.7.0 |
| `digital-boardgame-framework` | 0.42.0 |
| `react` | 19.2.7 |
| `react-dom` | 19.2.7 |
| `sharp` | 0.35.2 |
| `typescript` | 5.9.3 |
| `vite` | 5.4.21 |
| `vitest` | 2.1.9 |

`npm ls --depth=0` also reported optional `@emnapi/runtime@1.11.1` and `@img/sharp-wasm32@0.35.2` as extraneous after the clean install. Installation and both builds still exited 0.

## Dependency security audit

All seven reported findings are in the development dependency graph:

- critical: Vitest UI arbitrary file read/execution advisory;
- high: Vite path handling; two nanoid denial-of-service advisories; PostCSS source-map path traversal is included in the affected graph;
- moderate/transitive: Vite, esbuild, `@vitest/mocker`, and `vite-node` paths.

The audit recommends major Vite/Vitest updates for some paths. Phase 0 intentionally did not run `npm audit fix`, change the lockfile, or make a major-version upgrade. `npm audit --omit=dev` returned zero findings. See SEC-008 for the operational restriction: do not expose development servers or Vitest UI to untrusted networks.

## Architecture and data-boundary findings

The current system is documented in `ARCHITECTURE_CURRENT.md`. The most important conclusions are:

- The authoritative online action path and viewer projection are server-side.
- Existing multiplayer tests prove distinct tokens, bad-token rejection, turn ownership, one opponent-hand redaction scenario, report persistence, and move persistence.
- Polling is fixed at 2.5 seconds while waiting; optional Realtime only signals a refetch and does not broadcast state.
- Local filesystem storage survives server restarts unless `.data/` is deleted.
- Supabase RLS is intended to deny anon table access, but the checked-in schema is missing columns written by framework 0.42.0.
- The app contacts John's shared games hub for splash content, counters, identity, and leaderboard functions. These are not required for vanilla multiplayer and must be disabled before Project Chronicle staging.
- Full server snapshots are copied into reports, and the current triage read/resolve routes lack separate authorization.
- Game IDs and seat tokens come from `Math.random`, which is not acceptable for staging bearer credentials.
- Query-string tokens require referrer, logging, artifact, and long-term session-exchange mitigation.

## Secret and artwork hygiene

The targeted tracked-file audit found only `.env.example`, containing placeholders. No service-role key, Resend key, Cloudflare token, production credential, private key, VASSAL module, or extracted board-art file was found among tracked files by the performed path/pattern checks.

Upstream ignore rules did not cover `.env.local` and several common secret artifacts. Phase 0 expanded `.gitignore` and verified that these are now ignored:

- `.env`, `.env.local`, `.env.production`;
- `.dev.vars`, `.dev.vars.local`;
- `.wrangler/` state;
- `secrets.json`, `deploy-credentials.json`, `service-account.json`;
- `*.pem`, `*.key`, and `*.p12`.

`.env.example` remains intentionally trackable. VASSAL and extracted-map ignore rules remain intact. The browser loader reads the user's file locally and stores SVG text only in that browser's IndexedDB.

## License and IP inventory

`LICENSE` and John Champaign's notice are unchanged. `IP_BOUNDARY.md` distinguishes MIT-licensed software code from the underlying game, branding, data, rules wording, OCR PDF, VASSAL content, and artwork. Private access is documented as an evaluation control, not an intellectual-property license.

## Phase 0 changes relative to upstream

- Secret-related `.gitignore` hardening.
- Governance, architecture, security, test, deployment, roadmap, IP, decision, known-issue, and baseline documentation.
- No gameplay, engine, UI, server behavior, data, dependency, or rule changes.

## Required owner action to unblock publishing

1. Sign in to GitHub in either Chrome or the Codex in-app browser.
2. Tell Codex that the GitHub session is ready.

Codex can then create/confirm the fork, configure it as `origin`, push `main`, the archive branch, tag, and Phase 0 branch, configure protection if the account permits it, and open the Phase 0 pull request. No credential needs to be pasted into chat.

## Recommendation

Accept the upstream code as a reproducible **audit baseline**, but do not approve local multiplayer validation or any deployment as secure merely from this result. First complete GitHub preservation/publishing. Phase 1 should then repair and test the critical authorization and privacy boundaries in focused commits before Phase 2 staging.
