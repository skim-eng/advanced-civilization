import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const output = join(process.cwd(), 'dist-ui');
const forbiddenNames = [
  'SUPABASE_SERVICE_KEY',
  'SESSION_SECRET',
  'REPORT_ADMIN_TOKEN',
  'RATINGS_INGEST_KEY',
  'RESEND_API_KEY',
  'MAIL_FROM',
  'DBF_DATA_DIR',
];
const forbiddenValues = forbiddenNames.map((name) => process.env[name]).filter((value) => value && value.length >= 8);
const forbidden = [...forbiddenNames, ...forbiddenValues, 'games-hub-5vo.pages.dev'];
const findings = [];

function visit(path) {
  for (const name of readdirSync(path)) {
    const full = join(path, name);
    if (statSync(full).isDirectory()) visit(full);
    else {
      const contents = readFileSync(full);
      for (const needle of forbidden) {
        if (contents.includes(Buffer.from(needle))) findings.push(`${relative(process.cwd(), full)} contains ${forbiddenNames.includes(needle) ? needle : '[secret canary]'}`);
      }
    }
  }
}

visit(output);
if (findings.length) throw new Error(`browser artifact secret scan failed:\n${findings.join('\n')}`);
console.log(`Browser artifact scan passed (${forbidden.length} forbidden names/values; all dist-ui files and source maps checked).`);
