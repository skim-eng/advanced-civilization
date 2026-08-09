import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const root = process.cwd();
const browserRoot = join(root, 'dist-ui');
const functionsRoot = join(root, process.env.PAGES_FUNCTIONS_OUT_DIR ?? '.wrangler/phase2-functions');
const forbiddenBasenames = [
  /\.vmod$/i,
  /\.pdf$/i,
  /^board\.(?:png|jpe?g|webp|svg)$/i,
  /^map-(?:main|western|eastern)(?:-labeled)?\.svg$/i,
  /(?:ocr|rules).*(?:\.pdf|\.png|\.jpe?g)$/i,
];
const forbiddenFixtureValues = [
  'test-admin-credential-with-more-than-thirty-two-characters',
  'test-report-admin-token-more-than-thirty-two-characters',
  'schema-lifecycle-session-secret-more-than-thirty-two-characters',
  'local-realtime-service-canary',
];

function filesUnder(directory) {
  const files = [];
  const visit = (path) => {
    for (const name of readdirSync(path).sort()) {
      const full = join(path, name);
      if (statSync(full).isDirectory()) visit(full);
      else files.push(full);
    }
  };
  visit(directory);
  return files;
}

const browserFiles = filesUnder(browserRoot);
const functionFiles = filesUnder(functionsRoot);
if (!functionFiles.some((file) => basename(file) === 'index.js')) throw new Error('compiled Pages Functions bundle is missing');

const forbiddenFiles = [...browserFiles, ...functionFiles].filter((file) =>
  file.endsWith('.map') || forbiddenBasenames.some((pattern) => pattern.test(basename(file))),
);
if (forbiddenFiles.length) throw new Error(`forbidden deployment files:\n${forbiddenFiles.map((file) => relative(root, file)).join('\n')}`);

const browserFindings = [];
for (const file of browserFiles) {
  const contents = readFileSync(file);
  for (const value of forbiddenFixtureValues) {
    if (contents.includes(Buffer.from(value))) browserFindings.push(`${relative(root, file)} contains a private test fixture`);
  }
}
if (browserFindings.length) throw new Error(`private fixture scan failed:\n${browserFindings.join('\n')}`);

if (process.env.EXPECTED_DEPLOY_SHA) {
  const build = JSON.parse(readFileSync(join(browserRoot, 'version.json'), 'utf8')).build;
  if (build !== process.env.EXPECTED_DEPLOY_SHA.slice(0, 7)) {
    throw new Error(`browser build id ${build} does not match the expected deployment SHA`);
  }
}

const manifest = [...browserFiles, ...functionFiles].map((file) => ({
  file: relative(root, file),
  bytes: statSync(file).size,
  sha256: createHash('sha256').update(readFileSync(file)).digest('hex'),
}));
const totalBytes = manifest.reduce((sum, entry) => sum + entry.bytes, 0);
console.log(`Deployment artifact gate passed (${browserFiles.length} browser files, ${functionFiles.length} Functions files, ${totalBytes} bytes; no source maps or prohibited deploy assets).`);
