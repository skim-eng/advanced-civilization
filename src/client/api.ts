// Client-side API for async multiplayer: a GameClientApi (used by the framework's
// `useGame` hook) that talks to the HTTP host in src/server/http.ts, plus an
// optional Supabase Realtime subscription so clients refresh instantly on a move
// instead of only polling.
import { subscribeSupabaseRealtime } from 'digital-boardgame-framework/client/realtime';
import type { GameClientApi } from 'digital-boardgame-framework/client';
import type { Action, GameState } from '../engine/index.js';

export interface CivClientOpts {
  baseUrl?: string; // HTTP host, e.g. http://localhost:8787
  gameId: string;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}
type View = { view: GameState; yourTurn: boolean; turn: number; gameOver: boolean; you?: string };

/** A GameClientApi bound to one game + its scoped HttpOnly session. */
export function createCivClient({ baseUrl = '', gameId }: CivClientOpts): GameClientApi<GameState, Action> {
  const base = `${baseUrl}/api/games/${encodeURIComponent(gameId)}`;
  let knownTurn: number | undefined;
  const readView = async (response: Response): Promise<View> => {
    const view = await json<View>(response);
    knownTurn = view.turn;
    return view;
  };
  return {
    fetch: () => fetch(base).then(readView),
    submit: async (action) => {
      if (knownTurn === undefined) throw new Error('game revision is not loaded');
      const response = await fetch(`${base}/move`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, expectedTurn: knownTurn, requestId: globalThis.crypto.randomUUID() }),
      });
      return readView(response);
    },
    legalActions: () => fetch(`${base}/legal`).then((r) => json<Action[]>(r)),
    report: async () => { throw new Error('reporting is disabled'); },
  };
}

/** Exchange fragment-delivered invitation material for a scoped HttpOnly seat
 * session. The response deliberately returns no bearer credential. */
export async function exchangeInvitation(baseUrl: string, gameId: string, inviteToken: string): Promise<{ you: string }> {
  const response = await fetch(`${baseUrl}/api/games/${encodeURIComponent(gameId)}/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ inviteToken }),
  });
  return json<{ you: string }>(response);
}

/** Attach the player's hub identity to their seat (ranked attribution). Best-
 *  effort: a failure just leaves the seat unattributed (casual play). */
export async function claimSeat(baseUrl: string, gameId: string, identityToken: string): Promise<void> {
  try {
    await fetch(`${baseUrl}/api/games/${encodeURIComponent(gameId)}/claim`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identityToken }),
    });
  } catch { /* ignore — ranked attribution is optional */ }
}

/** Create a new networked game. `invites` maps each seat to a shareable URL; its
 * credential is carried in a fragment and exchanged immediately for a session. */
export async function createNetworkGame(baseUrl: string, body: { players: string[]; seed?: number; maxTurns?: number; emails?: Record<string, string>; ai?: Record<string, string>; boardPreset?: string }): Promise<{ gameId: string; invites: Record<string, string> }> {
  return fetch(`${baseUrl}/api/games`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => json<{ gameId: string; invites: Record<string, string> }>(r));
}

/** Extract a seat's secret token from its invite URL. */
export function tokenFromInvite(inviteUrl: string): string {
  const url = new URL(inviteUrl, location?.origin ?? 'http://localhost');
  return new URLSearchParams(url.hash.replace(/^#/, '')).get('invite') ?? '';
}

/** Optional realtime: refresh on a server "moved" broadcast. Wire into
 *  `useGame(client, { subscribe })`. Needs the public Supabase URL + anon key
 *  (safe in the bundle); falls back to polling when not configured. */
export function realtimeSubscribe(gameId: string, supabaseUrl?: string, anonKey?: string): ((onChange: () => void) => () => void) | undefined {
  if (!supabaseUrl || !anonKey) return undefined;
  return subscribeSupabaseRealtime({ supabaseUrl, anonKey, gameId });
}
