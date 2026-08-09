import { describe, expect, it } from 'vitest';
import { MAX_JSON_BODY_BYTES, parseJsonBytes, RequestInputError, validateCreateGameBody, validateInviteBody, validateMessageBody, validateMoveBody } from './request-input.js';
import { secureId } from './secure-id.js';

function statusOf(run: () => unknown): number | undefined {
  try { run(); return undefined; }
  catch (error) { return error instanceof RequestInputError ? error.status : undefined; }
}

describe('strict API request validation', () => {
  it('distinguishes empty, malformed, and oversized JSON', () => {
    expect(statusOf(() => parseJsonBytes(new Uint8Array()))).toBe(400);
    expect(statusOf(() => parseJsonBytes(new TextEncoder().encode('{')))).toBe(400);
    expect(statusOf(() => parseJsonBytes(new Uint8Array(MAX_JSON_BODY_BYTES + 1)))).toBe(413);
  });

  it('rejects duplicate seats, unsupported creation fields, and unexpected maps', () => {
    expect(statusOf(() => validateCreateGameBody({ players: ['italy', 'italy'] }))).toBe(422);
    expect(statusOf(() => validateCreateGameBody({ players: ['italy', 'africa'], unexpected: true }))).toBe(422);
    expect(statusOf(() => validateCreateGameBody({ players: ['italy', 'africa'], ai: { babylon: 'standard' } }))).toBe(422);
  });

  it('rejects malformed invitations and excessive messages', () => {
    expect(statusOf(() => validateInviteBody({ inviteToken: 'not-an-invite' }))).toBe(401);
    expect(statusOf(() => validateInviteBody({ inviteToken: secureId(), nested: {} }))).toBe(422);
    expect(statusOf(() => validateMessageBody({ body: 'x'.repeat(501) }))).toBe(422);
  });

  it('requires a revision/request id and rejects unknown actions or nested fields', () => {
    const valid = { action: { type: 'pass' }, expectedTurn: 0, requestId: crypto.randomUUID() };
    expect(validateMoveBody(valid).action).toEqual({ type: 'pass' });
    expect(statusOf(() => validateMoveBody({ action: { type: 'pass' }, expectedTurn: 0 }))).toBe(422);
    expect(statusOf(() => validateMoveBody({ ...valid, action: { type: 'unknown' } }))).toBe(422);
    expect(statusOf(() => validateMoveBody({ ...valid, action: { type: 'pass', nested: {} } }))).toBe(422);
    expect(statusOf(() => validateMoveBody({ ...valid, action: { type: 'move', moves: [{ from: 'a', to: 'b', count: 1, secret: {} }] } }))).toBe(422);
  });
});
