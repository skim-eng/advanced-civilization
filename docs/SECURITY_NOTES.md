# Security notes and Phase 1 risk register

Baseline: upstream `4b3f981cdf4b3cefbb8f523b0d78c9eb320e1422`.
Phase 1 implementation checkpoint:
`c0ee66fa4b3cddd9b0c3b36647ac718c1be21f26`.

Severity describes the original risk to a future private deployment. A Phase 1
resolution means the local/CI acceptance test passes; it is not authorization to
deploy.

## Findings and disposition

| ID | Original severity | Phase 1 disposition | Evidence / remaining boundary |
|---|---|---|---|
| SEC-001 | High | Resolved | Upstream hub, splash, counter, identity, leaderboard, rating, analytics, report, and beacon calls are absent under defaults. Optional owner services require explicit default-off flags and owner URLs. Network capture passes. |
| SEC-002 | Critical | Resolved | Report list/resolve routes are absent by default. Explicit enablement requires a strong server-only Authorization bearer; output strips snapshots, projections, logs, user-agent, and game ID. Player/anonymous/admin-negative tests pass. |
| SEC-003 | Critical availability | Resolved locally | Ordered migration and byte-equal schema include `identities`, `ranked_report`, and all framework columns. A fresh persistent PGlite PostgreSQL lifecycle passes. Owner Supabase verification remains a Phase 2 deployment gate. |
| SEC-003-RLS | Critical confidentiality | Resolved locally | Clean PostgreSQL verifies RLS flags, no public policies, anon/authenticated CRUD denial, and service-role lifecycle. Browser-artifact canaries pass. Realtime sends only `{turn}`/empty signals. PostgREST/hosted Realtime repetition remains Phase 2. |
| SEC-004 | Critical authorization | Resolved | Both server platforms inject 256-bit Web Crypto IDs; 2,000-value uniqueness/format tests and cross-game tests pass. |
| SEC-005 | High | Resolved for Phase 1 | Invitation material travels in a fragment, is POST-exchanged for an AES-GCM HttpOnly `SameSite=Strict` game-path cookie, and is removed with `replaceState`. HTTPS requires `Secure`; only loopback omits it. Query tokens fail. URL/history/referrer/log/console/artifact tests pass. Rotation/revocation is unsupported. |
| SEC-006 | High | Must fix before Phase 2 deployment | API adds `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, and `nosniff`; production CSP/frame/HSTS/noindex, Cloudflare Access, CORS/origin policy, and provider rate limits require the authorized deployment environment. |
| SEC-007 | High | Resolved | Player and standalone reporting/crash upload are disabled. New permitted report fields/body size/retention are zero. Legacy rows are inaccessible to players, admin output is minimized, and full purge is tested. |
| SEC-008 | High development exposure | Resolved | Seven baseline development findings were removed with pinned compatible Vite/Vitest/plugin updates. Full and production-only audits both report zero. |
| SEC-009 | Medium | Resolved in Phase 0 | Ignore coverage includes environment variants, provider state, credential exports, and key files while retaining `.env.example`. Targeted tracked-file/artifact scans find no secret. |
| SEC-010 | Medium | Resolved | Client reporter identity, lookup, legacy broadening, and reporting UI are removed. A foreign reporter value authorizes nothing. |
| SEC-011 | Medium/High | Resolved for local Phase 1 | Node/Pages reject invalid content type, empty/malformed/oversized/over-complex/unsupported bodies; moves require expected revision and random request ID; stale/duplicate/raced/wrong-seat writes fail safely. Public deployment access/rate controls remain SEC-006. |
| SEC-012 | Medium | Accepted development risk | Vite authoring write routes remain development-only. The documented command binds normally to loopback; never expose the development server to an untrusted network. |
| SEC-013 | High | Resolved | `docs/HIDDEN_STATE_MATRIX.md` inventories every private state class. Projection and raw API tests cover every seat in 2/4/6-player games, unauthenticated/cross-game denial, legal-action scoping, reports/admin, and the absent spectator role. |

Every issue originally classified `MUST_FIX_BEFORE_PHASE_1_COMPLETION` has a
passing local acceptance test. SEC-006 and service-specific parts of SEC-003-RLS
are deployment controls and remain `MUST_FIX_BEFORE_PHASE_2_DEPLOYMENT`; they are
not silently accepted as Phase 1 risk.

## Current trust boundaries

| Sensitive data | Storage / transport | Phase 1 control |
|---|---|---|
| Game/seat invitation credentials | Server metadata; one shareable fragment | Cryptographic generation, fragment exchange, encrypted scoped cookie, no query authentication, diagnostic redaction. |
| Opponent hands, calamities, offers, pending choices | Authoritative snapshot | Server-side role projection before HTTP; explicit placeholders/empty collections; raw API matrix. |
| Ordered deck, RNG, calamity provenance, resume snapshots | Authoritative snapshot only | Deck identities become `[hidden]`, RNG becomes sentinel `0`, provenance and resume metadata are removed from every browser projection. |
| Full snapshots and seat tokens in database | Filesystem or future Supabase server store | No browser DB access; RLS/grant tests deny anon/authenticated roles; service key is server-only and artifact-scanned. |
| Chat | Per-game message store | Every authenticated seat in the same game may read game-wide chat. There is no direct/private-message feature. Foreign/anonymous access fails. |
| Reports | Legacy database rows only | Submission/lookup disabled; default admin routes absent; explicit admin output sanitized; purge verified. |
| Realtime | Optional broadcast channel | Payload is exactly `{turn}` for moves or `{}` for messages; clients refetch the authenticated projection. No table-row subscription. |
| Emails/identity/rating metadata | Optional server metadata/services | Services are default-off, require owner endpoint configuration, and expose no secret through `VITE_` variables. |
| VASSAL artwork | User browser memory and IndexedDB | Bring-your-own parsing remains local; no upload path or committed proprietary art. |

## Secret and artifact controls

- Server-only variables include `SUPABASE_SERVICE_KEY`, `SESSION_SECRET`,
  `REPORT_ADMIN_TOKEN`, `RESEND_API_KEY`, and `RATINGS_INGEST_KEY`; none uses a
  `VITE_` prefix.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are intentionally
  client-safe configuration, but direct table access remains denied by RLS.
- The UI build has no generated source maps. The artifact scanner still walks
  every output file and any future `.map` files, checking eight forbidden
  server-only names/canary values.
- Playwright trace, screenshot, and video capture are disabled; tests inspect
  console/page errors without printing credentials. Temporary stores are unique
  and removed through guarded cleanup.
- API errors are fixed public messages and never serialize stack traces,
  snapshots, cards, database details, or credentials.

## Positive controls

- The server remains authoritative for current actor, legality, state transition,
  deterministic RNG, and persistence.
- Unique `(game, turn)` persistence plus expected-turn validation ensures exactly
  one same-turn transition commits.
- Browser external-request interception treats any non-loopback default request
  as a test failure.
- The canonical migration is applied from zero in CI; schema and migration
  snapshot equality is enforced.
- Player reports are not a second hidden-state store.
