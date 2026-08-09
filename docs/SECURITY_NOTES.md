# Security notes and baseline risk register

Audit target: upstream SHA `4b3f981cdf4b3cefbb8f523b0d78c9eb320e1422` plus the Phase 0 `.gitignore` hardening documented in `VANILLA_DEVIATIONS.md`.

Severity describes risk to the planned private staging deployment, not a claim about exploitability of John Champaign's public deployment.

## Open findings

### SEC-001 — Automatic traffic to an upstream-controlled games hub

- **Severity:** High; staging blocker
- **Evidence:** `SplashScreen`, `PlayCount`, `recordPlay`, `useIdentity`, `SignInBar`, server JWKS verification, and optional ratings use `https://games-hub-5vo.pages.dev`.
- **Impact:** Opening or using Project Chronicle can send request metadata, gameplay-mode counters, anonymous/registered identity data, redirect URLs, emails, names, and game results to a service the owner does not control.
- **Required action:** Disable these integrations by default behind an owner-controlled configuration. Do not render cross-promotion or identity/leaderboard UI in vanilla staging unless explicitly approved.

### SEC-002 — Report triage routes lack administrator authorization

- **Severity:** Critical; staging blocker
- **Evidence:** `GET /api/reports` calls `server.listReports()` and returns complete `BugReportRow` objects. `POST /api/reports/:id/resolve` resolves a report. Neither requires a seat token nor an admin credential.
- **Impact:** A visitor who passes the outer staging access gate could enumerate stored unredacted snapshots, reporter views, logs, user agents, messages, and game IDs, then alter resolution state. If the app were public, the routes would be public.
- **Required action:** Remove these routes from the public game API or protect them with a separate server-side administrator authorization boundary. Add negative integration tests.

### SEC-003 — Supabase schema does not match framework 0.42.0 writes

- **Severity:** Critical availability; staging blocker
- **Evidence:** `SupabaseStore.putGameMeta()` writes `identities` and `ranked_report`; `supabase/schema.sql` defines neither column. Its fallback handles a missing `ranked_report` only, then still writes `identities`.
- **Impact:** Creating or updating a production game is expected to fail against a fresh database made from the checked-in schema.
- **Required action:** Add an explicit reviewed migration and a clean-database integration test. Keep RLS enabled with no anon policies.

### SEC-004 — Game IDs and seat bearer tokens use `Math.random`

- **Severity:** Critical authorization; staging blocker
- **Evidence:** framework `GameServer.id()` concatenates two `Math.random().toString(36)` fragments and uses it for both game IDs and seat tokens.
- **Impact:** The apparent search space is not equivalent to cryptographically secure entropy; predictability or state recovery could compromise bearer invitations.
- **Required action:** Inject a cryptographically secure `idGen` in both Node and Pages Function wiring (for example, `crypto.randomUUID()` with an encoded form) and test token uniqueness, rejection, and game isolation.

### SEC-005 — Bearer seat tokens remain in query strings

- **Severity:** High
- **Evidence:** invitations and every authenticated API request use `?token=...`.
- **Impact:** Tokens cross the address bar, browser history, copied links, server/CDN request metadata, screenshots, and potentially referrers. They may be exposed through support artifacts even when application logs are quiet.
- **Required action:** Before staging, add `Referrer-Policy: no-referrer`, redact tokens from logs/errors/screenshots, avoid third-party subresources, and test browser artifacts. Long term, exchange an invite token for an HttpOnly, Secure, SameSite session and remove the token from the visible URL.

### SEC-006 — Missing deployment security headers and indexing controls

- **Severity:** High
- **Evidence:** baseline responses do not set Content-Security-Policy, explicit Referrer-Policy, X-Content-Type-Options, frame-ancestors, HSTS, or robots noindex. API responses allow `Access-Control-Allow-Origin: *`.
- **Impact:** The private-evaluation boundary relies entirely on a future service gate; token-bearing pages lack explicit referrer protection and anti-framing policy.
- **Required action:** Add and verify headers at the Pages/service layer, protect the entire site with Cloudflare Access, add robots directives, and verify unauthorized requests never reach the lobby/API.

### SEC-007 — Full snapshots are deliberately duplicated into reports

- **Severity:** High
- **Evidence:** an online report stores the unredacted latest snapshot plus the reporter view and client log. Local reports may upload full browser state. Reports have no retention or deletion policy in the repository.
- **Impact:** Reports become a second store for hidden cards, offer contents, game history, and user-agent metadata; deleting the game does not delete its reports.
- **Required action:** Keep reports on owner-controlled infrastructure only, add admin authentication, document retention/deletion, warn reporters, and consider minimizing or encrypting snapshots.

### SEC-008 — Development dependency audit findings

- **Severity:** High in exposed developer environments; lower for the static production runtime
- **Evidence:** `npm audit` reports 7 findings: 3 moderate, 3 high, 1 critical, involving Vite/Vitest and transitive esbuild, nanoid, and PostCSS packages. `npm audit --omit=dev` reports zero production findings.
- **Impact:** Several advisories affect development servers, source-map handling, or Vitest UI. The project uses `vitest run`, not Vitest UI, and must not expose Vite to untrusted networks.
- **Required action:** Do not auto-fix during baseline. Plan a focused compatibility-tested toolchain update; never run Vite/Vitest UI on an untrusted interface in the meantime.

### SEC-009 — Secret-ignore coverage was incomplete

- **Severity:** Medium; mitigated in Phase 0
- **Evidence:** upstream ignored `.env` and `.dev.vars` but not `.env.local`, `.env.production`, `.dev.vars.local`, `.wrangler/`, common credential exports, or key files.
- **Action taken:** Phase 0 expanded `.gitignore` while keeping `.env.example` trackable. No secret was found in tracked environment files during the targeted audit.

### SEC-010 — Standalone report identity is weak and report lookup has legacy broadening

- **Severity:** Medium
- **Evidence:** `reporterId()` uses `Math.random` and a timestamp in localStorage. `GET /api/report?reporter=...` scans all reports server-side and includes legacy untagged hotseat reports in the returned summary.
- **Impact:** This is not a robust authentication mechanism; a guessed/colliding marker or the legacy rule can disclose problem descriptions and resolutions.
- **Required action:** Treat reporter IDs as convenience identifiers only. Remove legacy broadening or authenticate report access before staging if reports remain enabled.

### SEC-011 — Game creation and standalone report submission are unauthenticated

- **Severity:** Medium behind a working Cloudflare Access gate; High without it
- **Evidence:** `POST /api/games` and `POST /api/report` require no game token and have no application-level rate limit.
- **Impact:** Unprotected deployment could create resource abuse, report spam, or free-tier exhaustion.
- **Required action:** Enforce Cloudflare Access for both SPA and Functions, add reasonable provider-level rate limits, validate body sizes, and load-test only at non-abusive levels.

### SEC-012 — Vite development write routes must remain local

- **Severity:** Medium
- **Evidence:** the Vite-only plugin accepts POSTs to `__save-territories` and `__save-coastlines` and writes repository JSON without authentication or an explicit body cap.
- **Impact:** Exposing the development server could let another reachable origin overwrite authoring data.
- **Required action:** Bind development to loopback, never expose it to an untrusted network, and consider a local-only host/origin check in a focused tooling change.

### SEC-013 — Hidden-state coverage is narrower than the state model

- **Severity:** High until Phase 1 completes
- **Evidence:** the existing multiplayer test proves one opponent-hand redaction scenario. It does not enumerate all pending offer fields, secret calamities, completed trade details, logs, reports, messages, errors, or future state additions.
- **Required action:** Build explicit server-response allow/deny tests for every hidden field and maintain them with the state schema.

## Positive controls observed

- The online server performs turn-ownership and action-legality checks before persistence.
- Filesystem and Supabase snapshot writes use a duplicate-turn conflict guard.
- Viewer projection happens before normal game-state responses and AI decisions.
- Realtime broadcasts only a turn signal, not state.
- Supabase SQL enables RLS with no anon policies for all four tables.
- Service-role and Resend keys are server-side variable names without a `VITE_` prefix.
- Vite production sourcemaps are not enabled; the Pages artifact contains no `.map` files in the observed build.
- Board artwork is loaded locally and stored in IndexedDB; the code has no upload path for it.
