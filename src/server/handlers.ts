// Platform-agnostic API router for Advanced Civilization online multiplayer.
// BOTH the Node dev host (src/server/http.ts, FsStore) and the Cloudflare Pages
// Function (functions/api/[[path]].ts, SupabaseStore) build a GameServer and
// delegate here. Keeping routing in one place is what makes local dev and
// production true parity — only the store/notifier/broadcaster differ.
import type { GameServer, BugReportRow, ReportFilter } from 'digital-boardgame-framework/server';
import { createGame, type Action, type GameState } from '../engine/index.js';
import { isSecureId } from './secure-id.js';
import type { SeatSessionCodec } from './session.js';
import { hasReportAdminAuthorization, type ReportAdminConfig } from './report-admin.js';
import { RequestInputError, validateClaimBody, validateCreateGameBody, validateInviteBody, validateMessageBody, validateMoveBody, validateResolutionBody } from './request-input.js';
// NOTE: import createGame from the engine (node-free), NOT newGameState from
// game-server.ts — that module top-level-imports FsStore (node:fs), which would
// break the Cloudflare Workers build of this shared router.
const newGameState = createGame;

export interface ApiResult {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface ApiRequestContext {
  sessions?: SeatSessionCodec;
  cookie?: string;
  secureCookies?: boolean;
  authorization?: string;
  reportAdmin?: ReportAdminConfig;
}

type Server = GameServer<GameState, Action, string>;

// Map known framework error strings to HTTP status codes.
function safeFailure(error: unknown): ApiResult {
  if (error instanceof RequestInputError) return { status: error.status, body: { error: error.message } };
  const message = error instanceof Error ? error.message : (error && typeof error === 'object' && typeof (error as { message?: unknown }).message === 'string' ? (error as { message: string }).message : '');
  if (message.includes('not found') || message.includes('No snapshot')) return { status: 404, body: { error: 'not found' } };
  if (message.includes('Invalid token')) return { status: 401, body: { error: 'authentication failed' } };
  if (message.includes('Not your turn')) return { status: 403, body: { error: 'not your turn' } };
  if (message.includes('Illegal action')) return { status: 422, body: { error: 'action rejected' } };
  if (message.includes('already exists') || message.includes('Conflict')) return { status: 409, body: { error: 'stale or duplicate request' } };
  return { status: 503, body: { error: 'request could not be completed' } };
}

/** Route one request. `putReport` (when provided) backs the standalone
 * `POST /api/report` used by hotseat play. Protected game routes authenticate
 * exclusively through the request context's scoped session cookie. */
export async function handleApi(
  server: Server,
  method: string,
  pathname: string,
  query: URLSearchParams,
  body: unknown,
  putReport?: (row: BugReportRow) => Promise<void>,
  context: ApiRequestContext = {},
): Promise<ApiResult> {
  const segs = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (segs[0] !== 'api') return { status: 404, body: { error: 'not found' } };
  if (segs[1] === 'health' && segs.length === 2 && method === 'GET') return { status: 200, body: { ok: true } };

  // Player and standalone reporting are disabled in the vanilla safe default.
  // In particular, a client-supplied reporter id is never an authorization key.
  if (segs[1] === 'report') return { status: 404, body: { error: 'reporting disabled' } };
  try {
    // ---- games ----
    if (segs[1] === 'games') {
      // POST /api/games  { players, seed?, maxTurns?, emails?, boardPreset? }
      if (segs.length === 2 && method === 'POST') {
        const b = validateCreateGameBody(body);
        let initialState: GameState;
        try {
          initialState = newGameState({ players: b.players, seed: b.seed, maxTurns: b.maxTurns, boardPreset: b.boardPreset });
        } catch (e) {
          // A rules-§16 setup problem (unknown preset / nation not available on
          // the board) is the caller's error, not a server fault.
          return { status: 422, body: { error: 'invalid game configuration' } };
        }
        return { status: 200, body: await server.createGame({ initialState, players: b.players, emails: b.emails, ...(b.ai ? { ai: b.ai } : {}) }) };
      }

      const gameId = segs[2];
      if (!gameId) return { status: 404, body: { error: 'not found' } };
      if (!isSecureId(gameId)) return { status: 404, body: { error: 'not found' } };

      // POST /api/games/:id/session { inviteToken }. The credential arrives in a
      // request body after the browser reads it from the URL fragment, then is
      // replaced by an encrypted, scoped HttpOnly cookie.
      if (segs[3] === 'session' && segs.length === 4 && method === 'POST') {
        if (!context.sessions) return { status: 503, body: { error: 'sessions are not configured' } };
        const inviteToken = validateInviteBody(body);
        const view = await server.fetch(gameId, inviteToken);
        const cookie = await context.sessions.setCookie(gameId, inviteToken, context.secureCookies ?? false);
        return { status: 200, body: { ok: true, you: view.you }, headers: { 'set-cookie': cookie } };
      }

      // Protected game routes accept the scoped browser session only. A legacy
      // `?token=` value is deliberately ignored.
      const token = context.sessions
        ? await context.sessions.tokenFromCookie(context.cookie, gameId, context.secureCookies ?? false)
        : undefined;
      if (!token) return { status: 401, body: { error: 'authentication required' } };

      // GET /api/games/:id
      if (segs.length === 3 && method === 'GET') return { status: 200, body: await server.fetch(gameId, token) };
      // GET /api/games/:id/legal
      if (segs[3] === 'legal' && method === 'GET') return { status: 200, body: await server.legalActions(gameId, token) };
      // POST /api/games/:id/claim { identityToken } — optional owner-controlled
      // identity attribution, gated by the same seat session as every game route.
      if (segs[3] === 'claim' && method === 'POST') {
        const idTok = validateClaimBody(body);
        const v = await server.claimSeat(gameId, token, idTok);
        return { status: 200, body: { ok: true, playerId: v.playerId } };
      }
      // POST /api/games/:id/move  { action, identityToken? }
      if (segs[3] === 'move' && method === 'POST') {
        const b = validateMoveBody(body);
        const current = await server.fetch(gameId, token);
        if (current.turn !== b.expectedTurn) return { status: 409, body: { error: 'stale or duplicate request' } };
        return { status: 200, body: await server.submit(gameId, token, b.action) };
      }
      // GET/POST /api/games/:id/messages
      if (segs[3] === 'messages') {
        if (method === 'GET') return { status: 200, body: await server.listMessages(gameId, token) };
        if (method === 'POST') return { status: 200, body: await server.postMessage(gameId, token, validateMessageBody(body)) };
      }
      // POST /api/games/:id/report
      if (segs[3] === 'report' && method === 'POST') {
        return { status: 404, body: { error: 'reporting disabled' } };
      }
    }

    // ---- reports (separate server-side administrator boundary) ----
    if (segs[1] === 'reports') {
      if (!context.reportAdmin) return { status: 404, body: { error: 'not found' } };
      if (!await hasReportAdminAuthorization(context.authorization, context.reportAdmin)) {
        return { status: 403, body: { error: 'administrator authorization required' } };
      }
      if (segs.length === 2 && method === 'GET') {
        // Forward the supported filters so triage can scope by app (category),
        // severity, recency, or game. The shared backend holds several ports'
        // reports; `?category=advciv` is what isolates this game's queue.
        const filter: ReportFilter = {};
        if (query.get('unresolved') === '1') filter.unresolved = true;
        const category = query.get('category'); if (category) filter.category = category;
        const appId = query.get('app_id'); if (appId) filter.appId = appId;
        const severity = query.get('severity'); if (severity) filter.severity = severity;
        const since = query.get('since'); if (since) filter.since = since;
        const gameId = query.get('gameId'); if (gameId) filter.gameId = gameId;
        const hasFilter = Object.keys(filter).length > 0;
        const rows = await server.listReports(hasFilter ? filter : undefined);
        return { status: 200, body: rows.map((row) => ({
          reportId: row.reportId,
          reporterSide: row.reporterSide,
          turnNumber: row.turnNumber,
          message: row.message,
          severity: row.severity,
          category: row.category,
          appId: row.appId,
          clientBuild: row.clientBuild,
          createdAt: row.createdAt,
          resolution: row.resolution,
        })) };
      }
      if (segs[3] === 'resolve' && method === 'POST') {
        await server.resolveReport(segs[2]!, validateResolutionBody(body));
        return { status: 200, body: { ok: true } };
      }
    }

    return { status: 404, body: { error: 'no route', pathname, method } };
  } catch (e) {
    return safeFailure(e);
  }
}
