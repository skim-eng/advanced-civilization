import { afterEach, describe, expect, it, vi } from 'vitest';
import { SupabaseBroadcaster } from 'digital-boardgame-framework/server';

afterEach(() => vi.unstubAllGlobals());

describe('state-free Realtime boundary', () => {
  it('sends only a turn signal for moves and an empty signal for messages', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(input), init });
      return new Response('', { status: 202 });
    }));

    const serviceKey = 'local-realtime-service-canary';
    const broadcaster = new SupabaseBroadcaster({
      supabaseUrl: 'http://127.0.0.1:54321',
      serviceKey,
    });
    await broadcaster.gameMoved('cryptographic-game-id', { turn: 42 });
    await broadcaster.messagePosted('cryptographic-game-id');

    expect(requests).toHaveLength(2);
    expect(requests[0]!.url).toBe('http://127.0.0.1:54321/realtime/v1/api/broadcast');
    expect(requests[0]!.init?.headers).toEqual({
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(String(requests[0]!.init?.body))).toEqual({
      messages: [{ topic: 'game:cryptographic-game-id', event: 'moved', payload: { turn: 42 } }],
    });
    expect(JSON.parse(String(requests[1]!.init?.body))).toEqual({
      messages: [{ topic: 'game:cryptographic-game-id', event: 'message', payload: {} }],
    });

    const wireBodies = requests.map((request) => String(request.init?.body)).join('\n');
    expect(wireBodies).not.toContain('snapshot');
    expect(wireBodies).not.toContain('hand');
    expect(wireBodies).not.toContain('token');
    expect(wireBodies).not.toContain('report');
    expect(wireBodies).not.toContain(serviceKey);
  });
});
