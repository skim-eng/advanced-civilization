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
- **Status:** Accepted and implemented in Phase 1
- **Decision:** Games-hub play counts, cross-promotion, identity, JWKS, and leaderboard integration must be disabled by default. They may be re-enabled only through an explicit configuration pointing to an owner-controlled service.
- **Reason:** Vanilla multiplayer does not require John's identity or leaderboard, and the staging app must not silently transmit player data to infrastructure outside the owner's control.

## ADR-0005 — Exchange invitation fragments for scoped browser sessions

- **Date:** 2026-08-09
- **Status:** Accepted and implemented in Phase 1
- **Decision:** Generate game IDs and invitation credentials with 256 bits from Web Crypto. Carry an invitation credential in a URL fragment, exchange it in a POST body for an AES-GCM-protected HttpOnly `SameSite=Strict` cookie scoped to that game's API path, and immediately remove the fragment with `history.replaceState`. Require `Secure` on HTTPS; the loopback Node exception omits only `Secure`. Ignore legacy query credentials on all protected routes.
- **Reason:** The fragment does not reach the HTTP server or referrer, and the reusable credential stops crossing logs/history on every request. A stateless encrypted session survives process restarts when the server secret is stable without creating a second session database.
- **Limit:** Invitation reuse is intentionally supported so a copied link can open a fresh device. Revocation/rotation is not supported by framework 0.42 and remains a documented pre-production limitation unless the owner requires it.

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
- **Consequence:** The workflow now also runs both audits, schema/RLS integration, browser-secret scan, repeated clean-build proof, and isolated Playwright. It does not deploy, provision services, or change gameplay.

## ADR-0008 — Disable player reporting; isolate legacy administration

- **Date:** 2026-08-09
- **Status:** Accepted and implemented in Phase 1
- **Decision:** Do not expose framework report submission or device-reporter lookup in vanilla. Render no reporting UI and send no automatic crash data. Keep legacy report list/resolve absent by default; explicit enablement requires a distinct server-side bearer and returns a sanitized metadata-only shape.
- **Reason:** Framework 0.42 deliberately duplicates full authoritative snapshots into reports, and the existing random client reporter marker is not an authorization boundary. Disabling submission is the least complex secure vanilla default and avoids designing a second private-data store during gameplay validation.

## ADR-0009 — Require bounded revision-aware API writes

- **Date:** 2026-08-09
- **Status:** Accepted and implemented in Phase 1
- **Decision:** Parse POST bodies under a 64 KiB limit and validate explicit endpoint schemas. Require network moves to include the last observed authoritative snapshot turn and a random request ID; reject stale/duplicate revisions before engine submission while retaining the store's unique-turn write as the concurrency guard. Serialize only fixed public error messages.
- **Reason:** Engine legality alone does not bound transport abuse, distinguish stale retries, or stop backend exception details from crossing the API boundary. Revision checking composes with the existing optimistic-concurrency store without changing gameplay decisions.

## ADR-0010 — Verify migrations and RLS with isolated PGlite PostgreSQL

- **Date:** 2026-08-09
- **Status:** Accepted for Phase 1 local/CI verification
- **Decision:** Treat ordered SQL under `supabase/migrations/` as canonical and verify it from zero with PGlite's real PostgreSQL engine in an isolated filesystem cluster. Model Supabase's browser and service roles explicitly, test RLS operations, close/reopen persistence, and scan browser artifacts for server-only credentials.
- **Reason:** The Phase 1 environment has no Docker/native PostgreSQL and hosted Supabase is prohibited. A PostgreSQL engine test provides materially stronger schema/RLS evidence than parsing SQL text while remaining reproducible and local.
- **Limit:** PGlite is single-connection and does not reproduce PostgREST or hosted Supabase Realtime. Those service-specific checks remain a Phase 2 pre-deployment gate; Phase 1 separately verifies the exact state-free Realtime wire payload and browser table-role denial.

## ADR-0011 — Treat future deck/RNG and pending choices as server-only state

- **Date:** 2026-08-09
- **Status:** Accepted and implemented in Phase 1
- **Decision:** Preserve the canonical deterministic state unchanged, but replace ordered deck identities with count-preserving `[hidden]` placeholders, replace outbound RNG with sentinel `0`, remove calamity provenance/resume snapshots, and expose pending-choice candidates or partial factions only to the named chooser. Preserve only the minimal holder/stage metadata required for the waiting UI. Maintain an explicit role-by-field matrix.
- **Reason:** The upstream projection covered hands and trade bundles but still exposed unrevealed future cards, random state, and internal/pending data through raw API responses. These fields are not required by rival clients.
- **Consequence:** Online transport and AI inputs are least-privilege without changing canonical state, seeded randomness, action legality, rules, or outcomes. Stack length remains visible so the existing ninth-stack control behaves normally.
