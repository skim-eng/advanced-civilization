import { isSecureId } from './secure-id.js';

export const SESSION_COOKIE = '__Secure-chronicle_seat';
export const LOCAL_SESSION_COOKIE = 'chronicle_seat';
const SESSION_VERSION = 1;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

interface SessionPayload {
  v: number;
  gameId: string;
  token: string;
  issuedAt: number;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid session');
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function cookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const index = part.indexOf('=');
    if (index < 0 || part.slice(0, index).trim() !== name) continue;
    return part.slice(index + 1).trim();
  }
  return undefined;
}

/** Stateless encrypted session. The browser receives an opaque value; the
 * original reusable invitation credential remains inside AES-GCM ciphertext. */
export class SeatSessionCodec {
  readonly #secret: string;

  constructor(secret: string) {
    if (secret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
    this.#secret = secret;
  }

  async #key(): Promise<CryptoKey> {
    const material = new TextEncoder().encode(this.#secret);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', material);
    return globalThis.crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }

  async seal(gameId: string, token: string): Promise<string> {
    if (!isSecureId(gameId) || !isSecureId(token)) throw new Error('invalid invitation');
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const payload: SessionPayload = { v: SESSION_VERSION, gameId, token, issuedAt: Date.now() };
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    const encrypted = await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await this.#key(), plaintext);
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return bytesToBase64Url(combined);
  }

  async open(value: string, expectedGameId: string): Promise<string | undefined> {
    try {
      const combined = base64UrlToBytes(value);
      if (combined.length < 29) return undefined;
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);
      const plaintext = await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await this.#key(), ciphertext);
      const payload = JSON.parse(new TextDecoder().decode(plaintext)) as Partial<SessionPayload>;
      if (payload.v !== SESSION_VERSION || payload.gameId !== expectedGameId || !isSecureId(payload.token)) return undefined;
      if (typeof payload.issuedAt !== 'number' || Date.now() - payload.issuedAt > SESSION_MAX_AGE_SECONDS * 1000) return undefined;
      return payload.token;
    } catch {
      return undefined;
    }
  }

  async tokenFromCookie(cookieHeader: string | undefined, gameId: string, secure: boolean): Promise<string | undefined> {
    const value = cookieValue(cookieHeader, secure ? SESSION_COOKIE : LOCAL_SESSION_COOKIE);
    return value ? this.open(value, gameId) : undefined;
  }

  async setCookie(gameId: string, token: string, secure: boolean): Promise<string> {
    const name = secure ? SESSION_COOKIE : LOCAL_SESSION_COOKIE;
    const value = await this.seal(gameId, token);
    const path = `/api/games/${encodeURIComponent(gameId)}`;
    return `${name}=${value}; Path=${path}; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure ? '; Secure' : ''}`;
  }
}
