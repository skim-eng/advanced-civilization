import { readFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_KEY;
const file = resolve(process.env.HOSTED_GAME_IDS_FILE ?? 'test-results/hosted-game-ids.json');
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
const ids = JSON.parse(readFileSync(file, 'utf8'));
if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(id))) {
  throw new Error('refusing cleanup: hosted game ID manifest is invalid');
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };
for (const id of [...new Set(ids)]) {
  for (const table of ['dbf_reports', 'dbf_games']) {
    const response = await fetch(`${url}/rest/v1/${table}?game_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers });
    if (!response.ok) throw new Error(`targeted ${table} cleanup failed with HTTP ${response.status}`);
  }
  for (const table of ['dbf_games', 'dbf_snapshots', 'dbf_messages', 'dbf_reports']) {
    const response = await fetch(`${url}/rest/v1/${table}?select=game_id&game_id=eq.${encodeURIComponent(id)}`, { headers });
    if (!response.ok || (await response.json()).length !== 0) throw new Error(`targeted cleanup verification failed for ${table}`);
  }
}
unlinkSync(file);
console.log(`Targeted hosted cleanup passed (${new Set(ids).size} game IDs; manifest removed).`);
