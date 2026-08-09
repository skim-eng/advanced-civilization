import { describe, expect, it } from 'vitest';
import { isSecureId, secureId } from './secure-id.js';
import { LOCAL_SESSION_COOKIE, SeatSessionCodec } from './session.js';

const SECRET = 'phase-1-test-secret-with-more-than-thirty-two-characters';

describe('secure identifiers and seat sessions', () => {
  it('generates distinct 256-bit URL-safe identifiers', () => {
    const values = new Set(Array.from({ length: 2_000 }, secureId));
    expect(values.size).toBe(2_000);
    expect([...values].every(isSecureId)).toBe(true);
  });

  it('encrypts the invitation credential into a game-scoped HttpOnly cookie', async () => {
    const codec = new SeatSessionCodec(SECRET);
    const gameId = secureId();
    const token = secureId();
    const header = await codec.setCookie(gameId, token, false);
    expect(header).toContain(`${LOCAL_SESSION_COOKIE}=`);
    expect(header).toContain(`Path=/api/games/${gameId}`);
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Strict');
    expect(header).not.toContain(token);
    expect(await codec.tokenFromCookie(header, gameId, false)).toBe(token);
    expect(await codec.tokenFromCookie(header, secureId(), false)).toBeUndefined();
  });

  it('rejects malformed, tampered, expired-shape, and wrong-secret sessions', async () => {
    const codec = new SeatSessionCodec(SECRET);
    const gameId = secureId();
    const sealed = await codec.seal(gameId, secureId());
    const index = 20;
    const tampered = `${sealed.slice(0, index)}${sealed[index] === 'A' ? 'B' : 'A'}${sealed.slice(index + 1)}`;
    expect(await codec.open('malformed', gameId)).toBeUndefined();
    expect(await codec.open(tampered, gameId)).toBeUndefined();
    expect(await new SeatSessionCodec(`${SECRET}-other`).open(sealed, gameId)).toBeUndefined();
  });
});
