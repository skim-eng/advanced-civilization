const ID_BYTES = 32;

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 256-bit opaque identifier for game IDs, invitation credentials, and reports. */
export function secureId(): string {
  const bytes = new Uint8Array(ID_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

export function isSecureId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}
