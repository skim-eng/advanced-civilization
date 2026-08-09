import { describe, expect, it } from 'vitest';
import { upstreamServiceConfig } from './game-server.js';

describe('owner-controlled external services', () => {
  it('is disabled by default even when an endpoint is inherited', () => {
    const values: Record<string, string> = { UPSTREAM_HUB_URL: 'https://owner.example' };
    expect(upstreamServiceConfig((key) => values[key])).toBeUndefined();
  });

  it('requires an explicit flag and an HTTP(S) owner endpoint', () => {
    const values: Record<string, string> = { ENABLE_UPSTREAM_SERVICES: 'true' };
    expect(() => upstreamServiceConfig((key) => values[key])).toThrow(/UPSTREAM_HUB_URL/);
    values.UPSTREAM_HUB_URL = 'file:///tmp/not-a-service';
    expect(() => upstreamServiceConfig((key) => values[key])).toThrow(/HTTP/);
  });

  it('derives every enabled endpoint from the configured owner URL', () => {
    const values: Record<string, string> = {
      ENABLE_UPSTREAM_SERVICES: 'true',
      UPSTREAM_HUB_URL: 'https://owner.example/services/',
    };
    expect(upstreamServiceConfig((key) => values[key])).toEqual({
      hubUrl: 'https://owner.example/services',
      playBeaconUrl: 'https://owner.example/services/stats/hit',
    });
  });
});
