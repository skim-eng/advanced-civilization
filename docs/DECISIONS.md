# Decision record

## ADR-0001 — Pin an exact upstream vanilla baseline

- **Date:** 2026-08-09
- **Status:** Accepted
- **Decision:** Begin from John Champaign's `main` commit `4b3f981cdf4b3cefbb8f523b0d78c9eb320e1422`. Preserve it with `archive/john-vanilla` and annotated tag `john-vanilla-2026-08-09-4b3f981`.
- **Reason:** Future vanilla, presentation, and original-game work must remain reviewable against a known, recoverable baseline.
- **Consequence:** Upstream history is retained; later changes use ordinary descendants and separate phase branches.

## ADR-0002 — Do not update baseline dependencies during Phase 0

- **Date:** 2026-08-09
- **Status:** Accepted
- **Decision:** Record the dependency audit but preserve `package.json` and `package-lock.json` unchanged during baseline verification.
- **Reason:** A dependency migration would obscure whether failures are upstream or introduced locally.
- **Consequence:** Seven development-tool audit findings remain open and must be handled in a focused follow-up before exposing development servers to untrusted networks.

## ADR-0003 — Preserve bring-your-own board art

- **Date:** 2026-08-09
- **Status:** Accepted
- **Decision:** Ship only the schematic board. Keep VASSAL module parsing entirely client-side and store extracted art only in the user's IndexedDB.
- **Reason:** This preserves upstream functionality without Project Chronicle distributing proprietary artwork.

## ADR-0004 — No upstream hub traffic in Project Chronicle staging

- **Date:** 2026-08-09
- **Status:** Accepted; implementation pending before staging
- **Decision:** Games-hub play counts, cross-promotion, identity, JWKS, and leaderboard integration must be disabled by default. They may be re-enabled only through an explicit configuration pointing to an owner-controlled service.
- **Reason:** Vanilla multiplayer does not require John's identity or leaderboard, and the staging app must not silently transmit player data to infrastructure outside the owner's control.

## ADR-0005 — Keep bearer invite links temporarily, harden their handling

- **Date:** 2026-08-09
- **Status:** Accepted for vanilla evaluation only; implementation pending
- **Decision:** Do not redesign authentication before vanilla validation unless testing shows immediate critical exposure. Before staging, add `Referrer-Policy: no-referrer`, redact tokens from logs and artifacts, and test cross-game isolation. Design a later token-to-session exchange that removes the token from the visible URL.
- **Reason:** This limits scope while acknowledging that a query-string bearer credential crosses browser-history and URL trust boundaries.

## ADR-0006 — Retain the supported Cloudflare Pages + Supabase architecture

- **Date:** 2026-08-09
- **Status:** Accepted for Phase 2
- **Decision:** Use Cloudflare Pages, Pages Functions, Supabase persistence, optional Supabase Realtime, and optional Resend. Do not migrate vanilla staging to an unrelated framework or provider.
- **Reason:** The upstream project already supports this path, reducing gameplay risk during baseline validation.

## ADR-0007 — Establish GitHub Actions validation before Phase 1 behavior work

- **Date:** 2026-08-09
- **Status:** Accepted
- **Decision:** Run the lockfile install, 174-test baseline, typecheck, server build, and UI build on every push and pull request using Node.js 24 on GitHub Actions. Add Playwright only after the untouched local multiplayer baseline has been verified.
- **Reason:** Phase 1 security and multiplayer work needs a repeatable hosted regression gate before behavior changes begin.
- **Consequence:** The initial workflow intentionally reproduces the existing command set and does not deploy, provision services, or change gameplay.
