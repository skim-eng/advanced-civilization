import { PGlite } from '@electric-sql/pglite';
import { GameServer, NoopBroadcaster, NoopNotifier } from 'digital-boardgame-framework/server';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { adapter, codec, createGame, type Action, type GameState } from '../../src/engine/index.js';
import { handleApi } from '../../src/server/handlers.js';
import { secureId } from '../../src/server/secure-id.js';
import { SeatSessionCodec } from '../../src/server/session.js';
import { applyMigrations, createSupabaseRoles, tableCount } from './migrations.js';
import { PgliteSnapshotStore } from './pglite-store.js';

const temporaryDirectories: string[] = [];
const SESSION_SECRET = 'schema-lifecycle-session-secret-more-than-thirty-two-characters';

afterEach(async () => {
  while (temporaryDirectories.length) await rm(temporaryDirectories.pop()!, { recursive: true, force: true });
});

function gameServer(store: PgliteSnapshotStore) {
  return new GameServer<GameState, Action, string>({
    adapter, codec, store, idGen: secureId,
    broadcaster: new NoopBroadcaster(), notifier: new NoopNotifier(),
    gameUrl: (gameId, token) => `http://localhost/?game=${gameId}#invite=${token}`,
  });
}

function inviteToken(url: string): string {
  return new URLSearchParams(new URL(url).hash.slice(1)).get('invite')!;
}

describe('schema migrations from zero', () => {
  it('supports create, both seats, projections, move, message, disabled reporting, restart, continuation, and deletion', async () => {
    const dataDirectory = await mkdtemp(join(tmpdir(), 'chronicle-pglite-'));
    temporaryDirectories.push(dataDirectory);
    let db = await PGlite.create(dataDirectory);
    await createSupabaseRoles(db);
    expect(await applyMigrations(db)).toEqual(['202608090001_phase1_schema.sql']);
    expect(await readFile(join(process.cwd(), 'supabase/schema.sql'), 'utf8')).toBe(await readFile(join(process.cwd(), 'supabase/migrations/202608090001_phase1_schema.sql'), 'utf8'));

    const columns = await db.query<{ column_name: string }>("select column_name from information_schema.columns where table_name = 'dbf_games' order by column_name");
    expect(columns.rows.map((row) => row.column_name)).toEqual(expect.arrayContaining(['identities', 'ranked_report']));
    await db.exec('set role service_role');

    let store = new PgliteSnapshotStore(db);
    let server = gameServer(store);
    const created = await server.createGame({
      initialState: createGame({ players: ['italy', 'africa'], seed: 401, maxTurns: 60, boardPreset: 'raw-2p' }),
      players: ['italy', 'africa'],
    });
    const italy = inviteToken(created.invites.italy!);
    const africa = inviteToken(created.invites.africa!);
    expect(italy).not.toBe(africa);
    expect((await server.fetch(created.gameId, italy)).you).toBe('italy');
    expect((await server.fetch(created.gameId, africa)).you).toBe('africa');

    const italyView = await server.fetch(created.gameId, italy);
    const actorToken = italyView.yourTurn ? italy : africa;
    await server.submit(created.gameId, actorToken, { type: 'pass' });
    await server.postMessage(created.gameId, italy, 'migration lifecycle');
    expect(await server.listMessages(created.gameId, africa)).toEqual([expect.objectContaining({ seat: 'italy', body: 'migration lifecycle' })]);

    const sessions = new SeatSessionCodec(SESSION_SECRET);
    const italyExchange = await handleApi(server, 'POST', `/api/games/${created.gameId}/session`, new URLSearchParams(), { inviteToken: italy }, undefined, { sessions });
    expect(italyExchange.status).toBe(200);
    const reporting = await handleApi(server, 'POST', `/api/games/${created.gameId}/report`, new URLSearchParams(), { message: 'disabled' }, undefined, { sessions, cookie: italyExchange.headers?.['set-cookie'] });
    expect(reporting.status).toBe(404);
    expect(await tableCount(db, 'dbf_reports')).toBe(0);

    const turnBeforeRestart = (await server.fetch(created.gameId, italy)).turn;
    await db.close();

    db = await PGlite.create(dataDirectory);
    await db.exec('set role service_role');
    store = new PgliteSnapshotStore(db);
    server = gameServer(store);
    const restartedSessions = new SeatSessionCodec(SESSION_SECRET);
    const [reItaly, reAfrica] = await Promise.all([
      handleApi(server, 'POST', `/api/games/${created.gameId}/session`, new URLSearchParams(), { inviteToken: italy }, undefined, { sessions: restartedSessions }),
      handleApi(server, 'POST', `/api/games/${created.gameId}/session`, new URLSearchParams(), { inviteToken: africa }, undefined, { sessions: restartedSessions }),
    ]);
    expect([reItaly.status, reAfrica.status]).toEqual([200, 200]);
    const italyAfterRestart = await handleApi(server, 'GET', `/api/games/${created.gameId}`, new URLSearchParams(), undefined, undefined, { sessions: restartedSessions, cookie: reItaly.headers?.['set-cookie'] });
    const africaAfterRestart = await handleApi(server, 'GET', `/api/games/${created.gameId}`, new URLSearchParams(), undefined, undefined, { sessions: restartedSessions, cookie: reAfrica.headers?.['set-cookie'] });
    expect((italyAfterRestart.body as { you: string; turn: number }).you).toBe('italy');
    expect((africaAfterRestart.body as { you: string; turn: number }).you).toBe('africa');
    expect((italyAfterRestart.body as { turn: number }).turn).toBe(turnBeforeRestart);

    const next = (italyAfterRestart.body as { yourTurn: boolean }).yourTurn ? { cookie: reItaly.headers?.['set-cookie'] } : { cookie: reAfrica.headers?.['set-cookie'] };
    const continued = await handleApi(server, 'POST', `/api/games/${created.gameId}/move`, new URLSearchParams(), {
      action: { type: 'pass' }, expectedTurn: turnBeforeRestart, requestId: crypto.randomUUID(),
    }, undefined, { sessions: restartedSessions, ...next });
    expect(continued.status).toBe(200);
    expect((continued.body as { turn: number }).turn).toBeGreaterThan(turnBeforeRestart);

    await server.deleteGame(created.gameId, italy);
    await db.query('delete from dbf_reports');
    expect(await tableCount(db, 'dbf_games')).toBe(0);
    expect(await tableCount(db, 'dbf_snapshots')).toBe(0);
    expect(await tableCount(db, 'dbf_messages')).toBe(0);
    expect(await tableCount(db, 'dbf_reports')).toBe(0);
    await db.close();
  }, 30_000);
});
