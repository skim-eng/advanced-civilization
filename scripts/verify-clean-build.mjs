import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();

function gitStatus() {
  return execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
}

function runNpmScript(name) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('npm_execpath is unavailable');
  execFileSync(process.execPath, [npmCli, 'run', name], { cwd: root, stdio: 'inherit' });
}

function artifactManifest(directories) {
  const entries = [];
  const visit = (path) => {
    for (const name of readdirSync(path).sort()) {
      const full = join(path, name);
      if (statSync(full).isDirectory()) visit(full);
      else if (name !== 'version.json') {
        const hash = createHash('sha256').update(readFileSync(full)).digest('hex');
        entries.push(`${relative(root, full)} ${hash}`);
      }
    }
  };
  for (const directory of directories) visit(join(root, directory));
  return entries.join('\n');
}

const before = gitStatus();
if (before) throw new Error(`worktree must be clean before build verification:\n${before}`);

runNpmScript('build');
runNpmScript('build:ui');
const first = artifactManifest(['dist', 'dist-ui']);

runNpmScript('build');
runNpmScript('build:ui');
const second = artifactManifest(['dist', 'dist-ui']);

if (first !== second) throw new Error('repeated build artifacts differ (excluding generated version.json)');
const after = gitStatus();
if (after) throw new Error(`build changed the worktree:\n${after}`);

console.log(`Clean repeated build verified (${first ? first.split('\n').length : 0} deterministic artifacts; version.json excluded).`);
