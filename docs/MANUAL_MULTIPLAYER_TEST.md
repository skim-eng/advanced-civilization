# Manual multiplayer record

Date: 2026-08-09  
Phase: 1 local-only  
Implementation checkpoint: `c0ee66fa4b3cddd9b0c3b36647ac718c1be21f26`

No deployed URL, Cloudflare resource, hosted Supabase project, production secret,
physical mobile device, or cross-network peer was used.

## Locally available checks

| Check | Result | Evidence |
|---|---|---|
| Local API + Vite UI | PASS | Loopback Node API and Vite UI started from an isolated filesystem store. |
| Two desktop seats | PASS | Italy and Africa opened as distinct seats, displayed correct identities, and completed a legal turn. |
| Refresh | PASS | Refresh retained the scoped session and authoritative state. |
| API restart | PASS | Restart over the same isolated store reconnected and continued. This now also has an automated regression test. |
| Polling fallback | PASS | With Realtime variables absent, the waiting seat observed the move. |
| Invitation copy/fresh context | PASS | A copied fragment invitation opened the same seat in a new isolated browser context, then disappeared from URL/history. |
| Private-state separation | PASS | Raw API tests, not visual inspection alone, prove role projection across every 2/4/6 seat. |
| Default network boundary | PASS | Browser harness recorded zero non-loopback requests. |

The untouched-baseline smoke record remains in
`docs/MULTIPLAYER_TEST_RESULTS.md`; Phase 1 automated Playwright supplies stronger
repeatable evidence than shared manual tabs.

## Not available in Phase 1

| Check | Status | Required context |
|---|---|---|
| iPhone Safari | NOT RUN | Physical iPhone and a permitted reachable environment. |
| Android Chrome | NOT RUN | Physical Android device and a permitted reachable environment. |
| Same-LAN second machine | NOT RUN | Exposing local development beyond loopback is intentionally prohibited. |
| Different-network joining | NOT RUN | Gated deployed staging environment. |
| Sleep/resume and background-tab mobile behavior | NOT RUN | Physical devices and staging. |
| Network switching / transient mobile loss | NOT RUN | Physical devices and staging. |
| Hosted Realtime latency | NOT RUN | Owner-controlled Supabase after Phase 2 authorization. |
| Deployment survival, Access, headers, domain | NOT RUN | Cloudflare/Supabase staging after Phase 2 authorization. |
| Load/soak | NOT RUN | Approved isolated environment and quota plan. |

These omissions are explicit Phase 2/device limitations. They do not replace
the automated local acceptance matrix and are not represented as passing.
