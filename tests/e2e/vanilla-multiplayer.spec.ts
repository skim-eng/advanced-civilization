import { expect, test, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:8787';

interface CreatedGame {
  gameId: string;
  invites: Record<string, string>;
}

interface GameSetup {
  players: string[];
  boardPreset: string;
}

const TWO_PLAYER: GameSetup = { players: ['italy', 'africa'], boardPreset: 'raw-2p' };

async function createGame(request: APIRequestContext, seed: number, setup: GameSetup = TWO_PLAYER): Promise<CreatedGame> {
  const response = await request.post(`${API_BASE}/api/games`, {
    data: { players: setup.players, seed, maxTurns: 60, boardPreset: setup.boardPreset },
  });
  if (response.status() !== 200) throw new Error(`Game creation failed with HTTP ${response.status()}`);
  return response.json() as Promise<CreatedGame>;
}

function tokenFromInvite(invite: string): string {
  const token = new URLSearchParams(new URL(invite).hash.replace(/^#/, '')).get('invite');
  if (!token) throw new Error('Game invitation did not contain a seat credential');
  return token;
}

async function exchangeInvite(request: APIRequestContext, gameId: string, inviteToken: string) {
  return request.post(`${API_BASE}/api/games/${encodeURIComponent(gameId)}/session`, {
    data: { inviteToken },
  });
}

async function monitorExternalTraffic(context: BrowserContext): Promise<string[]> {
  const unexpected: string[] = [];
  await context.route(/^https?:\/\//, async (route) => {
    const requestUrl = new URL(route.request().url());
    const host = requestUrl.hostname;
    if (host === '127.0.0.1') await route.continue();
    else {
      unexpected.push(`${route.request().method()} ${requestUrl.origin}${requestUrl.pathname}`);
      await route.abort('blockedbyclient');
    }
  });
  return unexpected;
}

async function openSeat(context: BrowserContext, invite: string, expectedSeat: string): Promise<Page> {
  const page = await context.newPage();
  try {
    await page.goto(invite, { waitUntil: 'domcontentloaded' });
  } catch {
    throw new Error(`Navigation failed for the ${expectedSeat} seat`);
  }

  const continueButton = page.getByRole('button', { name: 'Continue' });
  if (await continueButton.isVisible({ timeout: 750 }).catch(() => false)) await continueButton.click();

  await expect(page.getByText(new RegExp(`you are ${expectedSeat}`, 'i'))).toBeVisible();
  await expect.poll(() => page.url()).not.toContain('invite=');
  expect(new URL(page.url()).searchParams.get('game')).toBeTruthy();
  return page;
}

async function authenticatedFetch(request: APIRequestContext, gameId: string) {
  try {
    return await request.get(`${API_BASE}/api/games/${encodeURIComponent(gameId)}`);
  } catch {
    throw new Error('Authenticated game fetch failed before receiving an HTTP response');
  }
}

test.describe.configure({ mode: 'serial' });

test('isolates two browser seats and observes polling after a legal move', async ({ browser, request }) => {
  const game = await createGame(request, 101);
  expect(Object.keys(game.invites).sort()).toEqual(['africa', 'italy']);
  expect(game.invites.africa).not.toBe(game.invites.italy);

  const italyContext = await browser.newContext();
  const africaContext = await browser.newContext();
  const [italyExternal, africaExternal] = await Promise.all([
    monitorExternalTraffic(italyContext),
    monitorExternalTraffic(africaContext),
  ]);

  try {
    const [italyPage, africaPage] = await Promise.all([
      openSeat(italyContext, game.invites.italy!, 'Italy'),
      openSeat(africaContext, game.invites.africa!, 'Africa'),
    ]);

    const italyPass = italyPage.getByRole('button', { name: /Done .*\(pass\)/ });
    const africaPass = africaPage.getByRole('button', { name: /Done .*\(pass\)/ });
    const italyMayAct = await italyPass.isVisible();
    const actorPage = italyMayAct ? italyPage : africaPage;
    const waitingPage = italyMayAct ? africaPage : italyPage;
    const actorPass = italyMayAct ? italyPass : africaPass;

    await actorPass.click();
    await expect(actorPage.getByText(/Waiting for/)).toBeVisible();
    await expect(waitingPage.getByText(/Your turn —/)).toBeVisible({ timeout: 5_500 });
  } finally {
    await Promise.all([italyContext.close(), africaContext.close()]);
  }
  expect([...italyExternal, ...africaExternal]).toEqual([]);
});

test('creates isolated 4- and 6-player browser sessions with distinct credentials and identities', async ({ browser, request }) => {
  test.setTimeout(120_000);
  const setups: GameSetup[] = [
    { players: ['egypt', 'babylon', 'assyria', 'asia'], boardPreset: 'raw-4p-east' },
    { players: ['africa', 'italy', 'illyria', 'thrace', 'crete', 'asia'], boardPreset: 'raw-6p' },
  ];

  for (const [index, setup] of setups.entries()) {
    const game = await createGame(request, 150 + index, setup);
    expect(Object.keys(game.invites).sort()).toEqual([...setup.players].sort());
    expect(new Set(Object.values(game.invites)).size).toBe(setup.players.length);
    expect(new Set(Object.values(game.invites).map(tokenFromInvite)).size).toBe(setup.players.length);

    const contexts = await Promise.all(setup.players.map(() => browser.newContext()));
    const traffic = await Promise.all(contexts.map(monitorExternalTraffic));
    try {
      const pages = await Promise.all(setup.players.map((seat, seatIndex) => openSeat(contexts[seatIndex]!, game.invites[seat]!, seat)));
      for (const [seatIndex, page] of pages.entries()) {
        const seat = setup.players[seatIndex]!;
        await expect(page.getByText(new RegExp(`you are ${seat}`, 'i'))).toBeVisible();
        expect(page.url()).not.toContain('invite=');
      }

      // Repeated normal refreshes exercise the protected fetch path without
      // advancing or corrupting the authoritative revision.
      const first = pages[0]!;
      const turnBefore = await first.getByText(/^Turn \d+ \u00b7 you are /).textContent();
      for (let refresh = 0; refresh < 3; refresh++) {
        await first.reload();
        await expect(first.getByText(new RegExp(`you are ${setup.players[0]}`, 'i'))).toBeVisible();
      }
      expect(await first.getByText(/^Turn \d+ \u00b7 you are /).textContent()).toBe(turnBefore);
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
    expect(traffic.flat()).toEqual([]);
  }
});

test('rejects missing, malformed, and cross-game seat credentials on protected routes', async ({ request }) => {
  const [gameA, gameB] = await Promise.all([createGame(request, 201), createGame(request, 202)]);
  const italyA = tokenFromInvite(gameA.invites.italy!);

  const missing = await authenticatedFetch(request, gameA.gameId);
  expect(missing.status()).toBe(401);
  const legacyQuery = await request.get(`${API_BASE}/api/games/${encodeURIComponent(gameA.gameId)}`, { params: { token: italyA } });
  expect(legacyQuery.status()).toBe(401);
  expect((await exchangeInvite(request, gameA.gameId, 'malformed')).status()).toBe(401);
  expect((await exchangeInvite(request, gameB.gameId, italyA)).status()).toBe(401);

  expect((await exchangeInvite(request, gameA.gameId, italyA)).status()).toBe(200);
  const valid = await authenticatedFetch(request, gameA.gameId);
  expect(valid.status()).toBe(200);
  expect((await valid.json() as { you?: string }).you).toBe('italy');
  expect((await request.post(`${API_BASE}/api/games/${encodeURIComponent(gameA.gameId)}/report`, { data: { message: 'must stay local' } })).status()).toBe(404);
  expect((await request.get(`${API_BASE}/api/report`, { params: { reporter: 'foreign' } })).status()).toBe(404);
  expect((await request.get(`${API_BASE}/api/reports`)).status()).toBe(404);
  expect((await request.post(`${API_BASE}/api/reports/unknown/resolve`, { data: { note: 'no' } })).status()).toBe(404);

  const crossGameRequests = await Promise.all([
    authenticatedFetch(request, gameB.gameId),
    request.get(`${API_BASE}/api/games/${encodeURIComponent(gameB.gameId)}/legal`),
    request.post(`${API_BASE}/api/games/${encodeURIComponent(gameB.gameId)}/move`, { data: { action: { type: 'pass' } } }),
    request.get(`${API_BASE}/api/games/${encodeURIComponent(gameB.gameId)}/messages`),
    request.post(`${API_BASE}/api/games/${encodeURIComponent(gameB.gameId)}/messages`, { data: { body: 'isolation check' } }),
    request.post(`${API_BASE}/api/games/${encodeURIComponent(gameB.gameId)}/report`, { data: { message: 'isolation check', severity: 'bug' } }),
  ]);
  expect(crossGameRequests.map((response) => response.status())).toEqual([401, 401, 401, 401, 401, 401]);
});

test('exchanges a copied invitation into a refreshable HttpOnly session without URL, history, or referrer leakage', async ({ browser, request }) => {
  const game = await createGame(request, 251);
  const invite = game.invites.italy!;
  const credential = tokenFromInvite(invite);
  expect(new URL(invite).searchParams.has('token')).toBe(false);

  const first = await browser.newContext();
  const copied = await browser.newContext();
  let observedReferrer: string | undefined;
  await first.route('https://referrer.invalid/**', async (route) => {
    observedReferrer = route.request().headers().referer;
    await route.fulfill({ status: 204, body: '' });
  });
  try {
    const firstPage = await openSeat(first, invite, 'Italy');
    expect(await firstPage.evaluate(() => document.cookie)).not.toContain('chronicle_seat');
    expect(firstPage.url()).not.toContain(credential);
    await firstPage.reload();
    await expect(firstPage.getByText(/you are Italy/i)).toBeVisible();
    await firstPage.evaluate(() => fetch('https://referrer.invalid/probe'));
    expect(observedReferrer).toBeUndefined();

    const copiedPage = await openSeat(copied, invite, 'Italy');
    expect(copiedPage.url()).not.toContain(credential);
    await copiedPage.goBack({ waitUntil: 'domcontentloaded' });
    expect(copiedPage.url()).not.toContain(credential);
    expect(copiedPage.url()).not.toContain('invite=');
  } finally {
    await Promise.all([first.close(), copied.close()]);
  }
});

test('rejects malformed, oversized, unsupported, stale, duplicate, and wrong-player requests without mutation', async ({ request }) => {
  const createUrl = `${API_BASE}/api/games`;
  expect((await request.fetch(createUrl, { method: 'POST', headers: { 'content-type': 'text/plain' }, data: '{}' })).status()).toBe(415);
  expect((await request.fetch(createUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, data: Buffer.from('{') })).status()).toBe(400);
  expect((await request.fetch(createUrl, { method: 'POST', headers: { 'content-type': 'application/json' } })).status()).toBe(400);
  expect((await request.fetch(createUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, data: JSON.stringify({ padding: 'x'.repeat(65_536) }) })).status()).toBe(413);
  expect((await request.post(createUrl, { data: { players: ['italy', 'africa'], unexpected: true } })).status()).toBe(422);
  expect((await request.get(`${API_BASE}/api/games/not-a-valid-game-id`)).status()).toBe(404);

  const game = await createGame(request, 275);
  const italyInvite = tokenFromInvite(game.invites.italy!);
  const africaInvite = tokenFromInvite(game.invites.africa!);
  expect((await exchangeInvite(request, game.gameId, italyInvite)).status()).toBe(200);
  const italyResponse = await authenticatedFetch(request, game.gameId);
  const italyState = await italyResponse.json() as { turn: number; yourTurn: boolean };
  const actorInvite = italyState.yourTurn ? italyInvite : africaInvite;
  const offClockInvite = italyState.yourTurn ? africaInvite : italyInvite;
  const moveUrl = `${API_BASE}/api/games/${encodeURIComponent(game.gameId)}/move`;
  const requestId = crypto.randomUUID();

  expect((await exchangeInvite(request, game.gameId, offClockInvite)).status()).toBe(200);
  expect((await request.post(moveUrl, { data: { action: { type: 'pass' }, expectedTurn: italyState.turn, requestId: crypto.randomUUID() } })).status()).toBe(403);

  expect((await exchangeInvite(request, game.gameId, actorInvite)).status()).toBe(200);
  expect((await request.post(moveUrl, { data: { action: { type: 'unknown' }, expectedTurn: italyState.turn, requestId: crypto.randomUUID() } })).status()).toBe(422);
  expect((await request.post(moveUrl, { data: { action: { type: 'pass', nested: {} }, expectedTurn: italyState.turn, requestId: crypto.randomUUID() } })).status()).toBe(422);
  expect((await request.post(moveUrl, { data: { action: { type: 'pass' }, expectedTurn: italyState.turn + 1, requestId: crypto.randomUUID() } })).status()).toBe(409);
  expect((await request.post(`${API_BASE}/api/games/${encodeURIComponent(game.gameId)}/messages`, { data: { body: 'x'.repeat(501) } })).status()).toBe(422);

  const accepted = await request.post(moveUrl, { data: { action: { type: 'pass' }, expectedTurn: italyState.turn, requestId } });
  expect(accepted.status()).toBe(200);
  const acceptedTurn = (await accepted.json() as { turn: number }).turn;
  const duplicate = await request.post(moveUrl, { data: { action: { type: 'pass' }, expectedTurn: italyState.turn, requestId } });
  expect(duplicate.status()).toBe(409);
  const after = await authenticatedFetch(request, game.gameId);
  expect((await after.json() as { turn: number }).turn).toBe(acceptedTurn);
});

test('accepts exactly one of two simultaneous submissions for the same turn', async ({ request }) => {
  const game = await createGame(request, 301);
  const italy = tokenFromInvite(game.invites.italy!);
  const africa = tokenFromInvite(game.invites.africa!);
  expect((await exchangeInvite(request, game.gameId, italy)).status()).toBe(200);
  const italyView = await authenticatedFetch(request, game.gameId);
  const italyState = await italyView.json() as { yourTurn: boolean; turn: number };
  const italyOnClock = italyState.yourTurn;
  const actorToken = italyOnClock ? italy : africa;
  if (!italyOnClock) expect((await exchangeInvite(request, game.gameId, actorToken)).status()).toBe(200);
  const moveUrl = `${API_BASE}/api/games/${encodeURIComponent(game.gameId)}/move`;

  const responses = await Promise.all([
    request.post(moveUrl, { data: { action: { type: 'pass' }, expectedTurn: italyState.turn, requestId: '00000000-0000-4000-8000-000000000001' } }),
    request.post(moveUrl, { data: { action: { type: 'pass' }, expectedTurn: italyState.turn, requestId: '00000000-0000-4000-8000-000000000001' } }),
  ]);
  const statuses = responses.map((response) => response.status());
  expect(statuses.filter((status) => status === 200)).toHaveLength(1);
  expect(statuses.filter((status) => status !== 200)).toHaveLength(1);
});
