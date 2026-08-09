import { describe, expect, it } from 'vitest';
import { deploymentSecurityHeaders, isAllowedWriteOrigin } from './deployment-security.js';

describe('private staging response policy', () => {
  it('sets the complete non-indexed, non-embeddable HTTPS policy', () => {
    const headers = deploymentSecurityHeaders('https://project-ref.supabase.co');
    expect(headers['referrer-policy']).toBe('no-referrer');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['strict-transport-security']).toBe('max-age=31536000');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['x-robots-tag']).toBe('noindex, nofollow, noarchive');
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['content-security-policy']).toContain('https://project-ref.supabase.co');
    expect(headers['content-security-policy']).toContain('wss://project-ref.supabase.co');
    expect(headers['content-security-policy']).not.toContain('*.supabase.co');
  });

  it('does not trust a malformed or non-Supabase connect endpoint', () => {
    expect(deploymentSecurityHeaders('https://example.com')['content-security-policy'])
      .toContain("connect-src 'self'");
    expect(deploymentSecurityHeaders('not a url')['content-security-policy'])
      .not.toContain('not a url');
  });

  it('allows exact-origin and raw writes but rejects cross-origin/preflight writes', () => {
    const requestUrl = new URL('https://civ-vanilla.kimsvideo.org/api/games');
    expect(isAllowedWriteOrigin(requestUrl, 'POST', requestUrl.origin)).toBe(true);
    expect(isAllowedWriteOrigin(requestUrl, 'POST', null)).toBe(true);
    expect(isAllowedWriteOrigin(requestUrl, 'GET', 'https://foreign.example')).toBe(true);
    expect(isAllowedWriteOrigin(requestUrl, 'POST', 'https://foreign.example')).toBe(false);
    expect(isAllowedWriteOrigin(requestUrl, 'OPTIONS', 'https://foreign.example')).toBe(false);
    expect(isAllowedWriteOrigin(requestUrl, 'POST', 'not an origin')).toBe(false);
  });
});
