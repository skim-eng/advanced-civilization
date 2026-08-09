import type { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function createSupabaseRoles(db: PGlite): Promise<void> {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
  `);
}

export async function applyMigrations(db: PGlite): Promise<string[]> {
  const directory = join(process.cwd(), 'supabase', 'migrations');
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
  if (files.length === 0) throw new Error('no schema migrations found');
  for (const file of files) await db.exec(await readFile(join(directory, file), 'utf8'));
  return files;
}

export async function tableCount(db: PGlite, table: string): Promise<number> {
  if (!['dbf_games', 'dbf_snapshots', 'dbf_messages', 'dbf_reports'].includes(table)) throw new Error('unknown table');
  const result = await db.query<{ count: number }>(`select count(*)::int as count from ${table}`);
  return result.rows[0]?.count ?? -1;
}
