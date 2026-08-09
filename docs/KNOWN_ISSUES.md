# Known issues

Status reflects private staging validated application checkpoint
`36c974e5e9dc44d3ebe77cf8d67dc6f69ea93846`. Final hosted acceptance is in
`docs/VANILLA_STAGING_ACCEPTANCE.md`.

## Phase 1 blocker disposition

| ID | Status | Disposition / evidence |
|---|---|---|
| KI-001 | Resolved in Phase 0 | Fork, archive branch, protected baseline tag, Phase 0 branch, and PR 1 were published. |
| KI-002 | Resolved | Upstream services are absent by default; browser capture fails on any unexpected external request. |
| KI-003 | Resolved | Report administration is absent by default and separately authorized/sanitized when explicitly enabled. |
| KI-004 | Resolved | Ordered migrations and the schema snapshot include framework 0.42 fields; clean PostgreSQL lifecycle passes. |
| KI-005 | Resolved | Node and Pages inject 256-bit Web Crypto identifiers. |
| KI-006 | Resolved for Phase 1 | Fragment invitations exchange for encrypted HttpOnly game-scoped sessions; query credentials are rejected; URL/history/referrer/log/console tests pass. Rotation/revocation is not supported. |
| KI-007 | Resolved | Both `npm audit` and `npm audit --omit=dev` report zero findings after compatibility-tested toolchain updates. |
| KI-009 | Resolved | Build metadata is ignored output; repeated builds compare 156 deterministic artifacts and leave the worktree clean. |
| KI-011 | Resolved | Node and Pages enforce a 64 KiB JSON limit, strict shapes, safe errors, revision-aware writes, and duplicate/race rejection. |
| KI-013 | Resolved | Reporting is disabled with zero new retention; legacy report purge is documented and tested. |

## Remaining limitations and deferred deployment gates

| ID | Status | Limitation / next gate |
|---|---|---|
| KI-008 | Open performance observation | The minified UI JavaScript is 1,031.88 kB (295.44 kB gzip) and still triggers Vite's 500 kB warning. Do not mix unrelated optimization into Phase 1. |
| KI-010 | Open build-quality observation | `npm run build` still emits tests and source maps into local `dist` (154 files, about 2.3 MiB). `dist` is not the Pages artifact. |
| KI-012 | Resolved for private staging | The 2.5-second self-healing poll and optional state-free Realtime both passed hosted testing. Bounded measurements are in `VANILLA_STAGING_ACCEPTANCE.md`; no capacity extrapolation is made. |
| KI-014 | Accepted development constraint | This workstation has bundled Node/npm tooling rather than system `node`/`npm`; CI uses pinned Node 24 and ordinary `npm ci`. |
| KI-015 | Resolved for private staging | Owner Supabase denies browser roles, service lifecycle/cleanup passes, broadcasts are state-free, no game table is published, and deployed browser Realtime refetch/polling pass. |
| KI-016 | Resolved for private staging | Owner-authorized Zero Trust Free activated at `$0`; alias/preview/API Access, hosted controls, rollback, cleanup, and Free usage pass. This account has no `kimsvideo.org` zone, so the custom domain is an accepted conditional limitation and no DNS changed. |
| KI-017 | Accepted device limitation | Hosted isolated Chromium covers desktop 2/4/6 seats, reconnect, Realtime/polling, redeploy, and ten-game soak. Physical iPhone Safari, Android Chrome, sleep/resume, and network-switch behavior remain unrun before broader sharing. |
| KI-018 | Accepted provider limitation | Supabase Free provides no automatic/PITR restore. Recovery uses the checksum-pinned ordered migration from zero; create a verified untracked logical dump before any future hosted migration or owner data. |

No open issue is classified `MUST_FIX_BEFORE_PHASE_2_DEPLOYMENT`. The remaining
items are accepted private-staging limitations, not approval for a public launch
or Phase 3 work.
