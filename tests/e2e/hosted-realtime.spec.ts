import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

const APP_BASE = (process.env.PLAYWRIGHT_BASE_URL ?? '').replace(/\/$/, '');
const SUPABASE_HOST = process.env.PLAYWRIGHT_SUPABASE_HOST;
const ACCESS_HEADERS = process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET
  ? {
      'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
      'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET,
    }
  : undefined;
const HOSTED_GAME_IDS_FILE = resolve(process.env.HOSTED_GAME_IDS_FILE ?? 'test-results/hosted-game-ids.json');

function recordGameId(gameId: string): void {
  mkdirSync(dirname(HOSTED_GAME_IDS_FILE), { recursive: true });
  let ids: string[] = [];
  try { ids = JSON.parse(readFileSync(HOSTED_GAME_IDS_FILE, 'utf8')) as string[]; } catch { /* first hosted game */ }
  if (!ids.includes(gameId)) writeFileSync(HOSTED_GAME_IDS_FILE, `${JSON.stringify([...ids, gameId], null, 2)}\n`, { mode: 0o600 });
}

async function contextFor(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext();
  if (ACCESS_HEADERS) {
    await context.route(`${new URL(APP_BASE).origin}/**`, async (route) => {
      await route.continue({ headers: { ...route.request().headers(), ...ACCESS_HEADERS } });
    });
  }
  return context;
}

async function openSeat(context: BrowserContext, invite: string, seat: string, prepare?: (page: Page) => void): Promise<Page> {
  const page = await context.newPage();
  prepare?.(page);
  await page.goto(invite, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(new RegExp(`you are ${seat}`, 'i'))).toBeVisible();
  await expect.poll(() => page.url()).not.toContain('invite=');
  return page;
}

test('hosted Realtime accelerates a state-free refresh', async ({ browser, request }) => {
  test.skip(!APP_BASE || !SUPABASE_HOST, 'hosted-only provider check');
  const created = await request.post(`${APP_BASE}/api/games`, {
    data: { players: ['italy', 'africa'], seed: 909, maxTurns: 60, boardPreset: 'raw-2p' },
  });
  expect(created.status()).toBe(200);
  const game = await created.json() as { gameId: string; invites: Record<string, string> };
  recordGameId(game.gameId);

  const italy = await contextFor(browser);
  const africa = await contextFor(browser);
  let realtimeSocketSeen = false;
  let movedSignalSeen = false;
  const watchRealtime = (page: Page) => page.on('websocket', (socket) => {
    if (new URL(socket.url()).hostname !== SUPABASE_HOST) return;
    realtimeSocketSeen = true;
    socket.on('framereceived', (frame) => {
      const payload = String(frame.payload);
      if (payload.includes('moved') && payload.includes('turn')) movedSignalSeen = true;
    });
  });
  try {
    const [italyPage, africaPage] = await Promise.all([
      openSeat(italy, game.invites.italy!, 'Italy', watchRealtime),
      openSeat(africa, game.invites.africa!, 'Africa', watchRealtime),
    ]);
    await expect.poll(() => realtimeSocketSeen, { timeout: 10_000 }).toBe(true);

    const italyPass = italyPage.getByRole('button', { name: /Done .*\(pass\)/ });
    const actor = await italyPass.isVisible() ? italyPage : africaPage;
    const waiter = actor === italyPage ? africaPage : italyPage;
    const actorPass = actor === italyPage ? italyPass : africaPage.getByRole('button', { name: /Done .*\(pass\)/ });
    const started = Date.now();
    await actorPass.click();
    await expect(waiter.getByText(/Your turn —/)).toBeVisible({ timeout: 5_500 });
    await expect.poll(() => movedSignalSeen, { timeout: 5_500 }).toBe(true);
    expect(Date.now() - started).toBeLessThan(5_500);
  } finally {
    await Promise.all([italy.close(), africa.close()]);
  }
});
