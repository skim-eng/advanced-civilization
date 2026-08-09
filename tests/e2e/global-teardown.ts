import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default async function globalTeardown() {
  const dataDir = process.env.CHRONICLE_E2E_DATA_DIR;
  const expectedPrefix = join(tmpdir(), 'chronicle-playwright-');
  if (!dataDir || !dataDir.startsWith(expectedPrefix)) {
    throw new Error('Refusing to remove an unexpected Playwright data directory');
  }
  rmSync(dataDir, { recursive: true, force: true });
}
