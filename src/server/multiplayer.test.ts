import { afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Rng } from 'digital-boardgame-framework';
import { GameServer, NoopBroadcaster, NoopNotifier } from 'digital-boardgame-framework/server';
import { FsStore } from 'digital-boardgame-framework/server/node';
import { adapter, codec, createGame } from '../engine/index.js';
import type { Action, GameState, PlayerId } from '../engine/index.js';
import { HeuristicAI } from '../ai/heuristic.js';
import { handleApi } from './handlers.js';
import { secureId } from './secure-id.js';
import { SeatSessionCodec } from './session.js';

const temporaryDirectories: string[] = [];

function temporaryStore(prefix: string) {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return { directory, store: new FsStore(directory) };
}

afterAll(() => {
  for (const directory of temporaryDirectories) {
    if (!directory.startsWith(join(tmpdir(), 'civ-'))) throw new Error('Refusing to remove an unexpected test directory');
    rmSync(directory, { recursive: true, force: true });
  }
});

function makeServer() {
  const { store } = temporaryStore('civ-mp-');
  return new GameServer<GameState, Action, string>({
    adapter, codec, store, broadcaster: new NoopBroadcaster(), notifier: new NoopNotifier(),
    idGen: secureId,
    gameUrl: (g, t) => `/play?game=${g}#invite=${t}`,
  });
}
const tokenOf = (inviteUrl: string) => new URLSearchParams(new URL(inviteUrl, 'http://x').hash.slice(1)).get('invite')!;
const REPORT_ADMIN_TOKEN = 'test-admin-credential-with-more-than-thirty-two-characters';
const reportAdminContext = { reportAdmin: { token: REPORT_ADMIN_TOKEN }, authorization: `Bearer ${REPORT_ADMIN_TOKEN}` };

/** Create a 2-player game and return the server, id, and parsed per-seat invite
 * credentials. Production HTTP exchanges these fragment values for sessions. */
async function newGame(seed = 5) {
  const s = makeServer();
  const { gameId, invites } = await s.createGame({ initialState: createGame({ players: ['egypt', 'babylon'], seed }), players: ['egypt', 'babylon'] });
  return { s, gameId, egypt: tokenOf(invites.egypt!), babylon: tokenOf(invites.babylon!) };
}

describe('async multiplayer (GameServer + filesystem store)', () => {
  it('creates a game with a distinct secret token per seat', async () => {
    const { gameId, egypt, babylon } = await newGame();
    expect(gameId).toBeTruthy();
    expect(egypt).toBeTruthy();
    expect(egypt).not.toBe(babylon);
  });

  it('authenticates each request to a seat and rejects bad tokens', async () => {
    const { s, gameId, egypt, babylon } = await newGame();
    expect((await s.fetch(gameId, egypt)).you).toBe('egypt');
    expect((await s.fetch(gameId, babylon)).you).toBe('babylon');
    await expect(s.fetch(gameId, 'not-a-real-token')).rejects.toThrow();
  });

  it('enforces turn ownership — only the seat on the clock may submit', async () => {
    const { s, gameId, egypt, babylon } = await newGame();
    const ea = await s.fetch(gameId, egypt);
    const onClock = ea.yourTurn ? egypt : babylon;
    const offClock = ea.yourTurn ? babylon : egypt;
    await expect(s.submit(gameId, offClock, { type: 'pass' })).rejects.toThrow(); // not your turn
    expect(await s.submit(gameId, onClock, { type: 'pass' })).toBeTruthy();        // your turn: ok
  });

  it('persists moves and redacts opponent hands in per-seat views (§27.4)', async () => {
    const { s, gameId, egypt, babylon } = await newGame();
    // Drive both seats with the heuristic AI so cities actually get built — a
    // city-less player draws no trade cards (§27.1), so we must play to a trade
    // phase where Egypt holds a city to have any hand to redact.
    const ai = new HeuristicAI();
    const egyptHand = (n: GameState) => Object.values(n.players['egypt']!.hand).reduce((a, b) => a + b, 0);
    let guard = 0;
    while (guard++ < 600) {
      const info = await s.fetch(gameId, egypt);
      if (info.gameOver) break;
      if (info.view.phase === 'trade' && egyptHand(info.view) > 0) break;
      const seat = info.yourTurn ? egypt : babylon;
      const view = info.yourTurn ? info.view : (await s.fetch(gameId, babylon)).view;
      const actor: PlayerId = info.yourTurn ? 'egypt' : 'babylon';
      const action = await ai.selectAction({ state: view, actor, adapter, rng: new Rng(guard) });
      await s.submit(gameId, seat, action);
    }
    const egyptView = await s.fetch(gameId, egypt);
    const babylonView = await s.fetch(gameId, babylon);
    expect(egyptView.view.phase).toBe('trade');
    expect(egyptHand(egyptView.view)).toBeGreaterThan(0); // Egypt sees its own cards…
    expect(egyptHand(babylonView.view)).toBe(0);          // …redacted in Babylon's view
  });

  it.each([
    { label: '2-player', players: ['italy', 'africa'], boardPreset: 'raw-2p' },
    { label: '4-player', players: ['egypt', 'babylon', 'assyria', 'asia'], boardPreset: 'raw-4p-east' },
    { label: '6-player', players: ['africa', 'italy', 'illyria', 'thrace', 'crete', 'asia'], boardPreset: 'raw-6p' },
  ])('projects private state at the raw API boundary for every seat in a $label game', async ({ players, boardPreset }) => {
    const s = makeServer();
    const initialState = createGame({ players, boardPreset, seed: 707, maxTurns: 60 });
    for (const [index, id] of players.entries()) {
      initialState.players[id]!.hand = { [`hand-secret-${id}`]: index + 1 };
      initialState.players[id]!.calamities = [`legacy-secret-${id}`];
    }
    initialState.players[players[0]!]!.hand.ochre = 9;
    initialState.pendingDiscard = { holder: players[0]!, count: 1 };
    initialState.trade.stacks[1] = ['deck-secret-first', 'deck-secret-second'];
    initialState.rngState = 123_456_789;
    initialState.calamityTradedFrom = { 'provenance-secret': players[1]! };
    initialState.pendingCalamities = players.map((holder) => ({ calamityId: `queued-secret-${holder}`, holder }));
    initialState.negotiation.offers = players.map((from, index) => ({
      id: index + 1,
      from,
      give: { actual: { [`offer-secret-${from}`]: 3 }, declared: { salt: 3 } },
      wants: ['iron'],
      responses: [],
    }));
    initialState.negotiation.completed = [{
      a: players[0]!, b: players[1]!,
      aGave: { actual: { [`completed-secret-${players[0]}`]: 3 }, declared: { salt: 3 } },
      bGave: { actual: { [`completed-secret-${players[1]}`]: 3 }, declared: { iron: 3 } },
    }];

    const created = await s.createGame({ initialState, players });
    const sessions = new SeatSessionCodec('projection-test-session-secret-with-more-than-thirty-two-characters');
    const allInviteTokens = Object.values(created.invites).map(tokenOf);

    const unauthenticated = await handleApi(s, 'GET', `/api/games/${created.gameId}`, new URLSearchParams(), undefined, undefined, { sessions });
    expect(unauthenticated).toEqual({ status: 401, body: { error: 'authentication required' } });

    for (const id of players) {
      const inviteToken = tokenOf(created.invites[id]!);
      const exchange = await handleApi(s, 'POST', `/api/games/${created.gameId}/session`, new URLSearchParams(), { inviteToken }, undefined, { sessions });
      expect(exchange.status).toBe(200);
      const cookie = exchange.headers?.['set-cookie'];
      expect(cookie).toBeTruthy();

      const response = await handleApi(s, 'GET', `/api/games/${created.gameId}`, new URLSearchParams(), undefined, undefined, { sessions, cookie });
      expect(response.status).toBe(200);
      const body = response.body as { you: string; view: GameState };
      const encoded = JSON.stringify(body);
      expect(body.you).toBe(id);
      expect(body.view.players[id]!.hand[`hand-secret-${id}`]).toBe(players.indexOf(id) + 1);
      expect(body.view.trade.stacks[1]).toEqual(['[hidden]', '[hidden]']);
      expect(body.view.rngState).toBe(0);
      expect(body.view.calamityTradedFrom).toEqual({});

      for (const other of players.filter((candidate) => candidate !== id)) {
        expect(body.view.players[other]!.hand).toEqual({});
        expect(encoded).not.toContain(`hand-secret-${other}`);
        expect(encoded).not.toContain(`legacy-secret-${other}`);
        expect(encoded).not.toContain(`offer-secret-${other}`);
        expect(body.view.pendingCalamities.find((pending) => pending.holder === other)?.calamityId).toBe('[hidden]');
      }
      expect(encoded).not.toContain('deck-secret');
      expect(encoded).not.toContain('provenance-secret');
      expect(allInviteTokens.every((token) => !encoded.includes(token))).toBe(true);

      const legal = await handleApi(s, 'GET', `/api/games/${created.gameId}/legal`, new URLSearchParams(), undefined, undefined, { sessions, cookie });
      expect(legal.status).toBe(200);
      if (id === players[0]) expect(legal.body).toEqual([{ type: 'chooseDiscard', cards: ['hand-secret-' + id] }]);
      else expect(legal.body).toEqual([]);
    }

    if (players.length > 2) {
      const observer = players[2]!;
      const exchange = await handleApi(s, 'POST', `/api/games/${created.gameId}/session`, new URLSearchParams(), { inviteToken: tokenOf(created.invites[observer]!) }, undefined, { sessions });
      const observerResponse = await handleApi(s, 'GET', `/api/games/${created.gameId}`, new URLSearchParams(), undefined, undefined, { sessions, cookie: exchange.headers?.['set-cookie'] });
      expect((observerResponse.body as { view: GameState }).view.negotiation.completed).toEqual([]);
    }
  });

  it('accepts a bug report with the game log + snapshot, retrievable by category', async () => {
    const { s, gameId, egypt } = await newGame();
    const { reportId } = await s.report(gameId, egypt, {
      message: 'Movement looked wrong', severity: 'bug', category: 'game',
      clientLog: [{ turn: 1, kind: 'log', payload: 'egypt moved', ts: 0 }],
      clientBuild: 'web-ui', userAgent: 'test',
    });
    expect(reportId).toBeTruthy();
    const reports = await s.listReports({ category: 'game' });
    const r = reports.find((x) => x.reportId === reportId)!;
    expect(r).toBeTruthy();
    expect(r.message).toBe('Movement looked wrong');
    expect(r.gameId).toBe(gameId);
    expect(r.reporterSide).toBe('egypt');
    expect(r.serverSnapshot.length).toBeGreaterThan(0); // full game state captured
    expect(r.clientLog.length).toBe(1);                   // uploaded game log
  });

  it('disables player report lookup and gates sanitized report administration', async () => {
    const { s, gameId, egypt, babylon } = await newGame();
    const filed = await s.report(gameId, egypt, { message: 'ours', severity: 'bug', category: 'advciv', clientBuild: 'web-ui', userAgent: 't' });
    await s.report(gameId, babylon, { message: 'other game', severity: 'bug', category: 'other-port', clientBuild: 'web-ui', userAgent: 't' });
    const q = new URLSearchParams({ unresolved: '1', category: 'advciv' });

    expect((await handleApi(s, 'GET', '/api/report', new URLSearchParams({ reporter: 'foreign' }), undefined)).status).toBe(404);
    expect((await handleApi(s, 'GET', '/api/reports', q, undefined)).status).toBe(404);
    expect((await handleApi(s, 'GET', '/api/reports', q, undefined, undefined, { reportAdmin: { token: REPORT_ADMIN_TOKEN } })).status).toBe(403);
    expect((await handleApi(s, 'GET', '/api/reports', q, undefined, undefined, { reportAdmin: { token: REPORT_ADMIN_TOKEN }, authorization: `Bearer ${egypt}` })).status).toBe(403);

    const res = await handleApi(s, 'GET', '/api/reports', q, undefined, undefined, reportAdminContext);
    expect(res.status).toBe(200);
    const rows = res.body as Array<{ message: string; category?: string; serverSnapshot?: string; reporterView?: string; clientLog?: unknown }>;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.category === 'advciv')).toBe(true); // pollution from other ports filtered out
    expect(rows.some((r) => r.message === 'ours')).toBe(true);
    expect(rows.every((r) => r.serverSnapshot === undefined && r.reporterView === undefined && r.clientLog === undefined)).toBe(true);

    expect((await handleApi(s, 'POST', `/api/reports/${filed.reportId}/resolve`, new URLSearchParams(), { note: 'fixed' }, undefined, { reportAdmin: { token: REPORT_ADMIN_TOKEN }, authorization: `Bearer ${egypt}` })).status).toBe(403);
    expect((await handleApi(s, 'POST', `/api/reports/${filed.reportId}/resolve`, new URLSearchParams(), { note: 'fixed' }, undefined, reportAdminContext)).status).toBe(200);
  });

  it('GET /api/reports honours the ?app_id filter (server-stamped, shared-backend isolation)', async () => {
    // A server configured with this deployment's appId stamps every report.
    const { store } = temporaryStore('civ-app-');
    const s = new GameServer<GameState, Action, string>({
      adapter, codec, store, broadcaster: new NoopBroadcaster(), notifier: new NoopNotifier(),
      idGen: secureId, gameUrl: (g, t) => `/play?game=${g}#invite=${t}`, appId: 'advanced-civilization',
    });
    const { gameId, invites } = await s.createGame({ initialState: createGame({ players: ['egypt', 'babylon'], seed: 5 }), players: ['egypt', 'babylon'] });
    await s.report(gameId, tokenOf(invites.egypt!), { message: 'ours', severity: 'bug' });

    const ours = await handleApi(s, 'GET', '/api/reports', new URLSearchParams({ unresolved: '1', app_id: 'advanced-civilization' }), undefined, undefined, reportAdminContext);
    expect((ours.body as Array<{ appId?: string }>).every((r) => r.appId === 'advanced-civilization')).toBe(true);
    expect((ours.body as unknown[]).length).toBe(1);
    const other = await handleApi(s, 'GET', '/api/reports', new URLSearchParams({ app_id: 'some-other-game' }), undefined, undefined, reportAdminContext);
    expect((other.body as unknown[]).length).toBe(0); // another port's filter sees none of ours
  });

  it('rejects a bug report from a bad token', async () => {
    const { s, gameId } = await newGame();
    await expect(s.report(gameId, 'bogus', { message: 'x', severity: 'bug' })).rejects.toThrow();
  });

  it('persists submitted moves across fetches', async () => {
    const { s, gameId, egypt, babylon } = await newGame(9);
    const t0 = (await s.fetch(gameId, egypt)).turn;
    const onClock = (await s.fetch(gameId, egypt)).yourTurn ? egypt : babylon;
    await s.submit(gameId, onClock, { type: 'pass' });
    expect((await s.fetch(gameId, egypt)).turn).toBeGreaterThanOrEqual(t0);
  });

  it('reopens the filesystem store and scoped session after an application restart', async () => {
    const { directory } = temporaryStore('civ-restart-');
    const buildServer = () => new GameServer<GameState, Action, string>({
      adapter, codec, store: new FsStore(directory), idGen: secureId,
      broadcaster: new NoopBroadcaster(), notifier: new NoopNotifier(),
      gameUrl: (game, token) => `/play?game=${game}#invite=${token}`,
    });
    const secret = 'restart-test-session-secret-with-more-than-thirty-two-characters';
    let server = buildServer();
    const created = await server.createGame({
      initialState: createGame({ players: ['italy', 'africa'], seed: 81, maxTurns: 60, boardPreset: 'raw-2p' }),
      players: ['italy', 'africa'],
    });
    const italyToken = tokenOf(created.invites.italy!);
    const africaToken = tokenOf(created.invites.africa!);
    const sessions = new SeatSessionCodec(secret);
    const exchange = await handleApi(server, 'POST', `/api/games/${created.gameId}/session`, new URLSearchParams(), { inviteToken: italyToken }, undefined, { sessions });
    const cookie = exchange.headers?.['set-cookie'];
    const before = await server.fetch(created.gameId, italyToken);
    const actorToken = before.yourTurn ? italyToken : africaToken;
    await server.submit(created.gameId, actorToken, { type: 'pass' });
    const committedTurn = (await server.fetch(created.gameId, italyToken)).turn;

    // A new store, server, and session codec model a restarted Node process.
    server = buildServer();
    const restartedSessions = new SeatSessionCodec(secret);
    const reconnected = await handleApi(server, 'GET', `/api/games/${created.gameId}`, new URLSearchParams(), undefined, undefined, { sessions: restartedSessions, cookie });
    expect(reconnected.status).toBe(200);
    expect((reconnected.body as { you: string; turn: number }).you).toBe('italy');
    expect((reconnected.body as { turn: number }).turn).toBe(committedTurn);

    const italyAfter = await server.fetch(created.gameId, italyToken);
    const nextActor = italyAfter.yourTurn ? italyToken : africaToken;
    await server.submit(created.gameId, nextActor, { type: 'pass' });
    expect((await server.fetch(created.gameId, italyToken)).turn).toBe(committedTurn + 1);
  });

  it('returns a sanitized persistence failure and preserves the last committed turn', async () => {
    const { store } = temporaryStore('civ-failure-');
    const s = new GameServer<GameState, Action, string>({
      adapter, codec, store, idGen: secureId,
      broadcaster: new NoopBroadcaster(), notifier: new NoopNotifier(),
      gameUrl: (g, t) => `/play?game=${g}#invite=${t}`,
    });
    const { gameId, invites } = await s.createGame({ initialState: createGame({ players: ['italy', 'africa'], seed: 33, boardPreset: 'raw-2p' }), players: ['italy', 'africa'] });
    const italy = tokenOf(invites.italy!);
    const africa = tokenOf(invites.africa!);
    const actorToken = (await s.fetch(gameId, italy)).yourTurn ? italy : africa;
    const sessions = new SeatSessionCodec('test-session-secret-with-more-than-thirty-two-characters');
    const exchange = await handleApi(s, 'POST', `/api/games/${gameId}/session`, new URLSearchParams(), { inviteToken: actorToken }, undefined, { sessions });
    const cookie = exchange.headers?.['set-cookie'];
    expect(cookie).toBeTruthy();

    store.putSnapshot = async () => { throw new Error('database password=private-value connection interrupted'); };
    const result = await handleApi(s, 'POST', `/api/games/${gameId}/move`, new URLSearchParams(), {
      action: { type: 'pass' }, expectedTurn: 0, requestId: crypto.randomUUID(),
    }, undefined, { sessions, cookie });
    expect(result).toEqual({ status: 503, body: { error: 'request could not be completed' } });
    expect(JSON.stringify(result)).not.toContain('private-value');
    expect((await s.fetch(gameId, actorToken)).turn).toBe(0);
  });
});
