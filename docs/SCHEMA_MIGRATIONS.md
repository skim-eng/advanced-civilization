# Schema migrations

Canonical migration directory: `supabase/migrations/`.

`supabase/schema.sql` is a reviewed from-zero snapshot and must remain byte-for-byte equal to the first complete migration until a later incremental migration is added. The integration test enforces this relationship. Never repair a hosted database by manually adding a column without also adding an ordered migration and a clean-database regression test.

## Phase 1 migration

`202608090001_phase1_schema.sql` creates all four framework tables, indexes, constraints, and RLS state expected by digital-boardgame-framework 0.42.0. In particular, `dbf_games` includes both `identities jsonb not null default '{}'` and nullable `ranked_report jsonb`, matching every `SupabaseStore.putGameMeta()` field. Reports support the framework's nullable standalone columns even though application reporting is disabled.

The migration assumes Supabase's standard `anon`, `authenticated`, and `service_role` roles. It enables RLS on every `dbf_*` table, creates no public policies, revokes table privileges from browser roles, and grants the server role the required table/sequence access. The service-role credential must remain server-only.

## Clean local verification

This workstation has no Docker, Supabase CLI runtime, or native PostgreSQL server. Phase 1 therefore uses PGlite 0.5.4: the real PostgreSQL engine compiled to WebAssembly, with an isolated Node filesystem data directory. It supports PostgreSQL roles, grants, constraints, RLS, persistence, close/reopen, and SQLSTATE behavior without provisioning hosted infrastructure. This test does not claim hosted Supabase or Cloudflare acceptance.

Commands:

```text
npm ci
npm run test:schema
npm run test:rls
```

`test:schema` creates a fresh cluster and Supabase-equivalent roles, applies every migration in lexical order, checks the framework columns, switches to `service_role`, creates a two-seat game, fetches both projections, commits a legal action and authenticated message, proves reporting is disabled, closes the database, reconstructs the application/store, reconnects both seats, continues the game, deletes the game, purges legacy reports, and verifies all four tables are empty. The temporary database directory is recursively deleted by the test teardown.

`test:rls` creates another clean cluster and proves that `anon` and `authenticated` cannot select any raw row, token, snapshot, chat, or report and cannot insert, update, or delete protected data. It then proves `service_role` can perform and clean up the lifecycle. It also asserts all four RLS flags and the absence of public policies.

The ordinary source suite separately enables `SupabaseBroadcaster` against an
isolated local wire capture and asserts the exact request bodies: a move contains
only `{turn}` and a message contains `{}`. Neither payload includes a snapshot,
hand, token, report, or service credential. Browser clients never subscribe to
snapshot rows; a signal causes a fresh authenticated HTTP projection.

## Phase 2 hosted staging verification

The dedicated free-tier staging project is `csbcmaiytgotctodxahz` in
`us-east-1`. The canonical migration was applied from zero in lexical order
through the SQL editor. Its SHA-256 is
`78c377bbde6417871177833aec31cb8fdefb7df86e9c3873f1f4af13a46801c2`.
No database password or API key is recorded.

Hosted catalog verification found the expected four tables and every reviewed
column/index. Each table has RLS enabled, zero policies, no anon/authenticated
CRUD grant, and the required service-role grant. Actual PostgREST checks against
one targeted fixture returned 401 for all four anon reads and 403 for all four
authenticated reads. Server-only inserts returned 201, reads returned one row
each with 200, targeted deletion returned 204, cascading removal covered
snapshots/messages, and all four follow-up counts were zero. The temporary Auth
user was also deleted.

Actual hosted Realtime accepted the framework broadcaster and delivered one
`moved` payload with only `turn` plus one `message` payload with no keys. The
`supabase_realtime` publication contains zero `dbf_*` tables, so authoritative
rows are not a table-change feed. End-to-end browser refetch remains part of the
Cloudflare deployment gate.

Do not paste `schema.sql` into an already-populated project as an undocumented
substitute for ordered migrations.

## Data deletion

Game deletion uses `delete from dbf_games where game_id = …`; snapshots and messages cascade. Phase 1 creates no reports. A full legacy-report purge is `delete from dbf_reports` under the server role and is verified in the lifecycle test. Any future retention design requires a new migration and policy decision.

Phase 2 cleanup uses only recorded 256-bit game IDs. It deletes matching report
rows and the matching game row, relies on reviewed foreign-key cascades, then
requires zero matching rows in all four tables. Broad or unqualified deletion
is prohibited.

## Free-plan recovery boundary

The selected Supabase Free plan does not provide automatic backups or
point-in-time recovery. The versioned migration and its recorded checksum are
therefore the canonical schema recovery artifact. Applying it from zero in
both isolated PGlite and the hosted staging project rehearsed schema recovery.
Before any future hosted migration, create an untracked logical dump with the
Supabase CLI/`pg_dump`, checksum it without logging credentials, and restore it
only into a separate disposable target for catalog comparison. No owner game
data exists at this checkpoint, and no data-restore result is claimed.
