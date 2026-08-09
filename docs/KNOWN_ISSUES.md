# Known issues

Status reflects the Phase 1 implementation checkpoint
`c0ee66fa4b3cddd9b0c3b36647ac718c1be21f26`. Final hosted acceptance is
recorded separately in `docs/PHASE_1_ACCEPTANCE.md`.

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
| KI-012 | Must verify before Phase 2 deployment | The client retains a 2.5-second self-healing poll even when optional Realtime is configured. Local polling and the state-free Realtime wire contract pass; hosted service usage/quotas are unmeasured. |
| KI-014 | Accepted development constraint | This workstation has bundled Node/npm tooling rather than system `node`/`npm`; CI uses pinned Node 24 and ordinary `npm ci`. |
| KI-015 | Must verify before Phase 2 deployment | PGlite proves PostgreSQL schema/RLS semantics, but does not reproduce Supabase PostgREST or the hosted Realtime service. Repeat browser-role denial and state-free broadcast/refetch against a new owner-controlled environment only after Phase 2 authorization. |
| KI-016 | Must fix before Phase 2 deployment | Cloudflare Access, production headers/CSP/HSTS/noindex, provider rate limits, custom domain behavior, backup/restore, rollback, and deployed unauthorized-origin checks are not Phase 1 work. |
| KI-017 | Not run; not a Phase 1 blocker | Physical iPhone Safari, Android Chrome, cross-network, sleep/resume, network-switch, and load/soak testing require devices or deployed infrastructure. The local desktop/manual record is in `docs/MANUAL_MULTIPLAYER_TEST.md`. |

No Cloudflare environment or hosted Supabase project exists from Phase 1. No
claim of deployment readiness is made; these remaining items gate Phase 2
deployment, not merging the local vanilla multiplayer hardening branch.
