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

## Future hosted procedure

Phase 2, if authorized, must apply the ordered migrations to a new owner-controlled Supabase project using the platform's reviewed migration mechanism, record migration checksums, repeat the service/anon checks through PostgREST and Realtime, and rehearse rollback/restore before staging approval. Do not paste `schema.sql` into an already-populated project as an undocumented substitute for migrations.

## Data deletion

Game deletion uses `delete from dbf_games where game_id = …`; snapshots and messages cascade. Phase 1 creates no reports. A full legacy-report purge is `delete from dbf_reports` under the server role and is verified in the lifecycle test. Any future retention design requires a new migration and policy decision.
