# Vanilla reporting and report-administration policy

## Safe default

Player and standalone reporting are disabled. The browser renders no reporting control, performs no automatic crash upload, creates no client reporter identifier, and sends no report data. `/api/report` and authenticated `/api/games/:id/report` return `404`. Consequently the default permitted report field set and maximum report body size are both zero, and the retention period for newly submitted reports is zero.

Fields explicitly prohibited from report storage or forwarding include authoritative snapshots, any player's hand or calamity identities, offer contents not visible to every recipient, seat/invitation/session credentials, session cookies, legal-action lists containing private choices, emails, user-agent strings, client logs, stack traces, database errors, service keys, and arbitrary client-supplied metadata.

There is no player report-inbox route. A random browser identifier is not authentication, and a foreign `reporter` query value grants no access. The default has no external reporting or forwarding destination.

## Optional administration of legacy rows

Report triage is a separate, server-only feature for already-stored legacy rows. It remains absent unless `REPORT_ADMIN_ENABLED=true` and a server-only `REPORT_ADMIN_TOKEN` of at least 32 characters are both present. The credential is accepted only in `Authorization: Bearer …`, never in a URL, player cookie, or browser bundle.

An authorized list receives only report ID, reporting seat, turn, message, severity, category, application ID, client build, creation time, and resolution. The router strips authoritative snapshots, reporter projections, client logs, user agent, and game ID even from this administrator response. Resolution uses the same administrator boundary. Anonymous requests, player credentials, and invalid administrator credentials fail.

## Retention and deletion

- New vanilla reports: not created; retention is zero.
- Existing legacy rows: inaccessible to players and anonymous visitors immediately.
- Before any later environment is approved, the owner must either delete all legacy `dbf_reports` rows or approve a separately designed minimal reporting feature with an automated retention window.
- The reproducible schema procedure uses `delete from dbf_reports` for complete purge and verifies that the table is empty. Deleting a game does not implicitly preserve a Phase 1 report because Phase 1 creates none.

Application logs record neither report bodies nor administrator credentials. Error responses are subject to the API safe-error policy and credential redaction tests.
