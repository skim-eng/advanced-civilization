import { describe, expect, it } from 'vitest';
import { redactSensitiveUrlText } from './log-redaction.js';

describe('development log redaction', () => {
  it('redacts seat and service credentials in URL query strings', () => {
    const input = [
      'http proxy error: /api/games/g-1?token=seat-secret&turn=2',
      'redirect=/play?identityToken=identity-secret',
      'callback?access_token=oauth-secret&api_key=service-secret',
    ].join('\n');

    const output = redactSensitiveUrlText(input);

    expect(output).toContain('?token=[REDACTED]&turn=2');
    expect(output).toContain('?identityToken=[REDACTED]');
    expect(output).toContain('?access_token=[REDACTED]&api_key=[REDACTED]');
    expect(output).not.toContain('seat-secret');
    expect(output).not.toContain('identity-secret');
    expect(output).not.toContain('oauth-secret');
    expect(output).not.toContain('service-secret');
  });

  it('does not alter ordinary log messages or non-query text', () => {
    expect(redactSensitiveUrlText('token handling test passed')).toBe('token handling test passed');
    expect(redactSensitiveUrlText('/api/games/g-1?turn=2')).toBe('/api/games/g-1?turn=2');
  });
});
