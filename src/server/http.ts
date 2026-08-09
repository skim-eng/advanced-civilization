// A tiny Node HTTP host for the GameServer — enough to play async multiplayer
// locally (filesystem store, no Supabase). The same endpoints map cleanly to a
// Cloudflare Pages Function / Worker for production. Run: `npm run serve`.
import { createServer } from 'node:http';
import { buildGameServer, makeStore } from './game-server.js';
import { handleApi } from './handlers.js';
import { APP_ID } from '../report-meta.js';
import { makeLocalSessionCodec } from './session-node.js';
import { reportAdminConfig } from './report-admin.js';
import { assertJsonContentType, MAX_JSON_BODY_BYTES, parseJsonBytes, RequestInputError } from './request-input.js';

const PORT = Number(process.env.PORT ?? 8787);

const server = await buildGameServer();
const store = await makeStore(); // backs standalone hotseat reports
const sessions = await makeLocalSessionCodec();
const reportAdmin = reportAdminConfig((key) => process.env[key]);

function send(res: import('node:http').ServerResponse, code: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  const data = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'cache-control': 'no-store',
    ...extraHeaders,
  });
  res.end(data);
}
async function readJson(req: import('node:http').IncomingMessage): Promise<unknown> {
  assertJsonContentType(req.headers['content-type']);
  const declared = Number(req.headers['content-length'] ?? 0);
  if (Number.isFinite(declared) && declared > MAX_JSON_BODY_BYTES) throw new RequestInputError(413, 'request body too large');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = chunk as Buffer;
    size += bytes.byteLength;
    if (size > MAX_JSON_BODY_BYTES) throw new RequestInputError(413, 'request body too large');
    chunks.push(bytes);
  }
  return parseJsonBytes(Buffer.concat(chunks));
}

const http = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const body = req.method === 'POST' ? await readJson(req) : undefined;
    // Same router the Cloudflare Pages Function uses (dev/prod parity).
    const result = await handleApi(server, req.method ?? 'GET', url.pathname, url.searchParams, body, (row) => store.putReport({ ...row, appId: APP_ID }), {
      sessions,
      cookie: req.headers.cookie,
      secureCookies: false,
      authorization: req.headers.authorization,
      reportAdmin,
    });
    return send(res, result.status, result.body, result.headers);
  } catch (e) {
    if (e instanceof RequestInputError) send(res, e.status, { error: e.message });
    else send(res, 500, { error: 'request could not be completed' });
  }
});

http.listen(PORT, () => console.log(`Advanced Civilization server on http://localhost:${PORT} (store: ${process.env.SUPABASE_URL ? 'Supabase' : 'filesystem .data/games'})`));
