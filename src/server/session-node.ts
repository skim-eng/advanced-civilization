import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { secureId } from './secure-id.js';
import { SeatSessionCodec } from './session.js';

/** Persist a local-only session secret beside the isolated filesystem store so
 * browser sessions survive a normal development-server restart. */
export async function makeLocalSessionCodec(dataDir = process.env.DBF_DATA_DIR ?? '.data/games'): Promise<SeatSessionCodec> {
  await mkdir(dataDir, { recursive: true });
  const path = join(dataDir, '.session-secret');
  let secret: string;
  try {
    secret = (await readFile(path, 'utf8')).trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const generated = `${secureId()}${secureId()}`;
    try {
      await writeFile(path, `${generated}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      secret = generated;
    } catch (writeError) {
      if ((writeError as NodeJS.ErrnoException).code !== 'EEXIST') throw writeError;
      secret = (await readFile(path, 'utf8')).trim();
    }
  }
  return new SeatSessionCodec(secret);
}
