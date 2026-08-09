// Cloudflare Pages Function — the PRODUCTION online-multiplayer API. Catches all
// /api/* requests and delegates to the same handleApi router the Node dev host
// uses (true dev/prod parity). Local dev does NOT use this file.
//
// Imports the Workers-SAFE server barrel only (no node:fs). FsStore lives at
// digital-boardgame-framework/server/node and is NEVER imported here.
import { GameServer, SupabaseStore, SupabaseBroadcaster, ResendNotifier, NoopNotifier, verifyIdentityToken, type Jwks } from 'digital-boardgame-framework/server';
import { createClient } from '@supabase/supabase-js';
import { adapter, codec, type Action, type GameState } from '../../src/engine/index.js';
import { HeuristicAI } from '../../src/ai/heuristic.js';
import { handleApi } from '../../src/server/handlers.js';
import { APP_ID } from '../../src/report-meta.js';
import { secureId } from '../../src/server/secure-id.js';
import { SeatSessionCodec } from '../../src/server/session.js';
import { reportAdminConfig } from '../../src/server/report-admin.js';
import { readFetchJson, RequestInputError } from '../../src/server/request-input.js';
import { isAllowedWriteOrigin } from '../../src/server/deployment-security.js';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  PUBLIC_BASE_URL?: string;
  /** Shared secret matching the hub's RATINGS_INGEST_KEY (enables ranked play). */
  RATINGS_INGEST_KEY?: string;
  /** Optional external integrations remain off unless this is exactly `true`. */
  ENABLE_UPSTREAM_SERVICES?: string;
  /** Owner-controlled identity/counter/rating service base URL. */
  UPSTREAM_HUB_URL?: string;
  /** At least 32 random characters; encrypts stateless HttpOnly seat sessions. */
  SESSION_SECRET: string;
  REPORT_ADMIN_ENABLED?: string;
  REPORT_ADMIN_TOKEN?: string;
}

// Optional identity verification: no fetch is reachable under default config.
let _jwks: Jwks | undefined;
let _jwksAt = 0;
let _jwksUrl: string | undefined;
async function getJwks(hubUrl: string): Promise<Jwks> {
  if (_jwksUrl !== hubUrl) { _jwks = undefined; _jwksAt = 0; _jwksUrl = hubUrl; }
  if (!_jwks || Date.now() - _jwksAt > 3_600_000) {
    _jwks = (await (await fetch(`${hubUrl}/id/jwks`)).json()) as Jwks;
    _jwksAt = Date.now();
  }
  return _jwks;
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);

  if (!isAllowedWriteOrigin(url, request.method, request.headers.get('origin'))) {
    return new Response(JSON.stringify({ error: 'cross-origin request denied' }), {
      status: 403,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  const notifier = env.RESEND_API_KEY
    ? new ResendNotifier({ apiKey: env.RESEND_API_KEY, from: env.MAIL_FROM ?? 'Advanced Civilization <noreply@example.com>' })
    : new NoopNotifier();
  const site = (env.PUBLIC_BASE_URL ?? url.origin).replace(/\/$/, '');
  let hubUrl: string | undefined;
  if (env.ENABLE_UPSTREAM_SERVICES === 'true') {
    if (!env.UPSTREAM_HUB_URL) return new Response(JSON.stringify({ error: 'server configuration error' }), { status: 500, headers: { 'content-type': 'application/json' } });
    const parsed = new URL(env.UPSTREAM_HUB_URL);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return new Response(JSON.stringify({ error: 'server configuration error' }), { status: 500, headers: { 'content-type': 'application/json' } });
    hubUrl = parsed.toString().replace(/\/+$/, '');
  }

  const store = new SupabaseStore(supabase);
  let sessions: SeatSessionCodec;
  try { sessions = new SeatSessionCodec(env.SESSION_SECRET ?? ''); }
  catch { return new Response(JSON.stringify({ error: 'server configuration error' }), { status: 500, headers: { 'content-type': 'application/json' } }); }
  let reportAdmin;
  try { reportAdmin = reportAdminConfig((key) => env[key as keyof Env]); }
  catch { return new Response(JSON.stringify({ error: 'server configuration error' }), { status: 500, headers: { 'content-type': 'application/json' } }); }
  const server = new GameServer<GameState, Action, string>({
    snapshotHistory: 20,   // cap per-game snapshot history (framework >=0.32)
    adapter,
    codec,
    store,
    aiControllers: { standard: new HeuristicAI() },   // server-driven, rated AI seats

    broadcaster: new SupabaseBroadcaster({ supabaseUrl: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_KEY }),
    notifier,
    idGen: secureId,
    gameUrl: (gameId, token) => `${site}/?game=${encodeURIComponent(gameId)}#invite=${encodeURIComponent(token)}`,
    // Stamp every in-game report with this app's id so triage can isolate our
    // reports on the shared backend.
    appId: APP_ID,
    ...(hubUrl ? {
      playBeacon: { appId: APP_ID, url: `${hubUrl}/stats/hit` },
      verifyIdentity: async (t: string) => verifyIdentityToken(t, await getJwks(hubUrl!)),
    } : {}),
    ...(hubUrl && env.RATINGS_INGEST_KEY
      ? { ratings: { game: 'advanced-civilization', ingestKey: env.RATINGS_INGEST_KEY, hubUrl } }
      : {}),
  });

  let body: unknown = undefined;
  if (request.method === 'POST') {
    try { body = await readFetchJson(request); }
    catch (error) {
      const status = error instanceof RequestInputError ? error.status : 400;
      const message = error instanceof RequestInputError ? error.message : 'invalid request body';
      return new Response(JSON.stringify({ error: message }), { status, headers: { 'content-type': 'application/json', 'referrer-policy': 'no-referrer' } });
    }
  }

  const result = await handleApi(server, request.method, url.pathname, url.searchParams, body, (row) => store.putReport({ ...row, appId: APP_ID }), {
    sessions,
    cookie: request.headers.get('cookie') ?? undefined,
    secureCookies: true,
    authorization: request.headers.get('authorization') ?? undefined,
    reportAdmin,
  });
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'content-type': 'application/json', 'referrer-policy': 'no-referrer', ...(result.headers ?? {}) },
  });
};
