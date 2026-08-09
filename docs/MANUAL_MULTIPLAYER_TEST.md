# Manual multiplayer record

Date: 2026-08-09  
Phase: 2 private vanilla staging
Validated application: `36c974e5e9dc44d3ebe77cf8d67dc6f69ea93846`

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

## Remaining physical-device limitations

| Check | Status | Required context |
|---|---|---|
| iPhone Safari | NOT RUN | Physical iPhone and a permitted reachable environment. |
| Android Chrome | NOT RUN | Physical Android device and a permitted reachable environment. |
| Same-LAN second machine | NOT RUN | Exposing local development beyond loopback is intentionally prohibited. |
| Different-network joining | PASS (isolated hosted contexts) | Separate authenticated browser contexts used the remote Access-protected deployment; a second physical network was not used. |
| Sleep/resume and background-tab mobile behavior | NOT RUN | Physical devices and staging. |
| Network switching / transient mobile loss | NOT RUN | Physical devices and staging. |
| Hosted Realtime latency | PASS | State-free refresh measured 333.46–1,238.69 ms in the bounded soak. |
| Deployment survival and Access | PASS | Raw unauthenticated denial, owner browser access, security headers, redeploy persistence, and rollback/restore passed. |
| Custom domain | NOT APPLICABLE | Selected Cloudflare account has zero zones; no DNS changed. |
| Load/soak | PASS (bounded) | Ten games, mixed 2/4/6 seats, 117 requests; no capacity extrapolation. |

The physical-device omissions are accepted private-staging limitations. They do
not replace the automated local and hosted acceptance matrices and are not
represented as passing.

## Phase 2 provider result

The owner Supabase project passed catalog, PostgREST role, service lifecycle,
state-free Realtime, recovery, and targeted cleanup checks. The private Pages
deployment passed 7/7 hosted Playwright tests, 2/4/6-seat isolation, refresh,
reconnect, polling, Realtime, redeploy persistence, Access, headers, invitation
diagnostics, rollback, and the bounded ten-game soak. Temporary test Access
credentials were removed; only the owner policies remain.
