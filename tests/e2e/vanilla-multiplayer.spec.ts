import { expect, test, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:8787';

interface CreatedGame {
  gameId: string;
  invites: Record<string, string>;
}

async function createGame(request: APIRequestContext, seed: number): Promise<CreatedGame> {
  const response = await request.post(`${API_BASE}/api/games`, {
    data: { players: ['italy', 'africa'], seed, maxTurns: 60, boardPreset: 'raw-2p' },
  });
  if (response.status() !== 200) throw new Error(`Game creation failed with HTTP ${response.status()}`);
  return response.json() as Promise<CreatedGame>;
}

function tokenFromInvite(invite: string): string {
  const token = new URL(invite).searchParams.get('token');
  if (!token) throw new Error('Game invitation did not contain a seat credential');
  return token;
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
  await page.evaluate(() => history.replaceState(null, '', location.pathname));
  return page;
}

async function authenticatedFetch(request: APIRequestContext, gameId: string, token: string) {
  try {
    return await request.get(`${API_BASE}/api/games/${encodeURIComponent(gameId)}`, { params: { token } });
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

test('rejects missing, malformed, and cross-game seat credentials on protected routes', async ({ request }) => {
  const [gameA, gameB] = await Promise.all([createGame(request, 201), createGame(request, 202)]);
  const italyA = tokenFromInvite(gameA.invites.italy!);

  const valid = await authenticatedFetch(request, gameA.gameId, italyA);
  expect(valid.status()).toBe(200);
  expect((await valid.json() as { you?: string }).you).toBe('italy');

  const missing = await authenticatedFetch(request, gameA.gameId, '');
  expect(missing.status()).toBe(401);
  const malformed = await authenticatedFetch(request, gameA.gameId, 'malformed');
  expect(malformed.status()).toBe(401);

  const crossGameRequests = await Promise.all([
    authenticatedFetch(request, gameB.gameId, italyA),
    request.get(`${API_BASE}/api/games/${encodeURIComponent(gameB.gameId)}/legal`, { params: { token: italyA } }),
    request.post(`${API_BASE}/api/games/${encodeURIComponent(gameB.gameId)}/move`, { params: { token: italyA }, data: { action: { type: 'pass' } } }),
    request.get(`${API_BASE}/api/games/${encodeURIComponent(gameB.gameId)}/messages`, { params: { token: italyA } }),
    request.post(`${API_BASE}/api/games/${encodeURIComponent(gameB.gameId)}/messages`, { params: { token: italyA }, data: { body: 'isolation check' } }),
    request.post(`${API_BASE}/api/games/${encodeURIComponent(gameB.gameId)}/report`, { params: { token: italyA }, data: { message: 'isolation check', severity: 'bug' } }),
  ]);
  expect(crossGameRequests.map((response) => response.status())).toEqual([401, 401, 401, 401, 401, 401]);
});

test('accepts exactly one of two simultaneous submissions for the same turn', async ({ request }) => {
  const game = await createGame(request, 301);
  const italy = tokenFromInvite(game.invites.italy!);
  const africa = tokenFromInvite(game.invites.africa!);
  const italyView = await authenticatedFetch(request, game.gameId, italy);
  const italyOnClock = (await italyView.json() as { yourTurn: boolean }).yourTurn;
  const actorToken = italyOnClock ? italy : africa;
  const moveUrl = `${API_BASE}/api/games/${encodeURIComponent(game.gameId)}/move`;

  const responses = await Promise.all([
    request.post(moveUrl, { params: { token: actorToken }, data: { action: { type: 'pass' } } }),
    request.post(moveUrl, { params: { token: actorToken }, data: { action: { type: 'pass' } } }),
  ]);
  const statuses = responses.map((response) => response.status());
  expect(statuses.filter((status) => status === 200)).toHaveLength(1);
  expect(statuses.filter((status) => status !== 200)).toHaveLength(1);
});
