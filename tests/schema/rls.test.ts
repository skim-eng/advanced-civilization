import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { applyMigrations, createSupabaseRoles, tableCount } from './migrations.js';

async function denied(run: () => Promise<unknown>): Promise<void> {
  await expect(run()).rejects.toThrow();
}

describe('row-level security from a clean database', () => {
  it('denies browser roles every protected operation while service_role completes the lifecycle', async () => {
    const db = await PGlite.create('memory://');
    await createSupabaseRoles(db);
    await applyMigrations(db);

    const rls = await db.query<{ relname: string; relrowsecurity: boolean }>(`
      select relname, relrowsecurity from pg_class
      where relname in ('dbf_games', 'dbf_snapshots', 'dbf_messages', 'dbf_reports')
      order by relname
    `);
    expect(rls.rows).toHaveLength(4);
    expect(rls.rows.every((row) => row.relrowsecurity)).toBe(true);
    expect((await db.query<{ count: number }>("select count(*)::int as count from pg_policies where tablename like 'dbf_%'")).rows[0]?.count).toBe(0);

    await db.exec('set role service_role');
    await db.query(`insert into dbf_games (game_id, players, tokens, emails, identities, ranked_report)
      values ('g-rls', '["italy","africa"]'::jsonb, '{"italy":"seat-private"}'::jsonb, '{}'::jsonb, '{}'::jsonb, null)`);
    await db.query("insert into dbf_snapshots (game_id, turn, state) values ('g-rls', 0, 'full-private-snapshot')");
    await db.query("insert into dbf_messages (game_id, seat, body) values ('g-rls', 'italy', 'private-chat')");
    await db.query("insert into dbf_reports (report_id, game_id, reporter_side, turn_number, server_snapshot, reporter_view, message, severity) values ('r-rls', 'g-rls', 'italy', 0, 'full-private-snapshot', 'private-view', 'message', 'bug')");
    expect(await tableCount(db, 'dbf_games')).toBe(1);
    expect((await db.query<{ tokens: Record<string, string> }>("select tokens from dbf_games where game_id = 'g-rls'")).rows[0]?.tokens.italy).toBe('seat-private');
    await db.query("update dbf_games set resolved = true where game_id = 'g-rls'");

    await db.exec('reset role; set role anon');
    await denied(() => db.query('select * from dbf_games'));
    await denied(() => db.query('select tokens from dbf_games'));
    await denied(() => db.query('select state from dbf_snapshots'));
    await denied(() => db.query('select * from dbf_messages'));
    await denied(() => db.query('select * from dbf_reports'));
    await denied(() => db.query("insert into dbf_games (game_id, players, tokens) values ('anon', '[]'::jsonb, '{}'::jsonb)"));
    await denied(() => db.query("update dbf_games set tokens = '{}'::jsonb where game_id = 'g-rls'"));
    await denied(() => db.query("delete from dbf_games where game_id = 'g-rls'"));

    await db.exec('reset role; set role authenticated');
    await denied(() => db.query('select * from dbf_games'));

    await db.exec('reset role; set role service_role');
    expect(await tableCount(db, 'dbf_games')).toBe(1);
    await db.query("delete from dbf_reports where report_id = 'r-rls'");
    await db.query("delete from dbf_games where game_id = 'g-rls'");
    expect(await tableCount(db, 'dbf_games')).toBe(0);
    expect(await tableCount(db, 'dbf_snapshots')).toBe(0);
    expect(await tableCount(db, 'dbf_messages')).toBe(0);
    expect(await tableCount(db, 'dbf_reports')).toBe(0);
    await db.close();
  }, 30_000);
});
