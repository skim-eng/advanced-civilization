import type { Action } from '../engine/index.js';
import { isSecureId } from './secure-id.js';

export const MAX_JSON_BODY_BYTES = 64 * 1024;

export class RequestInputError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'RequestInputError';
  }
}

export function assertJsonContentType(contentType: string | undefined | null): void {
  if (contentType?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') {
    throw new RequestInputError(415, 'content-type must be application/json');
  }
}

export function parseJsonBytes(bytes: Uint8Array): unknown {
  if (bytes.byteLength === 0) throw new RequestInputError(400, 'request body required');
  if (bytes.byteLength > MAX_JSON_BODY_BYTES) throw new RequestInputError(413, 'request body too large');
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new RequestInputError(400, 'malformed JSON'); }
}

export async function readFetchJson(request: Request): Promise<unknown> {
  assertJsonContentType(request.headers.get('content-type'));
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > MAX_JSON_BODY_BYTES) throw new RequestInputError(413, 'request body too large');
  if (!request.body) throw new RequestInputError(400, 'request body required');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_JSON_BODY_BYTES) {
        await reader.cancel();
        throw new RequestInputError(413, 'request body too large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return parseJsonBytes(bytes);
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new RequestInputError(422, `${label} must be an object`);
  }
  return value as JsonRecord;
}

function exactKeys(value: JsonRecord, allowed: readonly string[], label: string): void {
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key));
  if (unexpected) throw new RequestInputError(422, `${label} contains unsupported field`);
}

function boundedJson(value: unknown, depth = 0, seen = { nodes: 0 }): void {
  seen.nodes += 1;
  if (seen.nodes > 2_000 || depth > 10) throw new RequestInputError(422, 'request structure is too complex');
  if (typeof value === 'string' && value.length > 4_096) throw new RequestInputError(422, 'request string is too long');
  if (typeof value === 'number' && !Number.isFinite(value)) throw new RequestInputError(422, 'request contains an invalid number');
  if (Array.isArray(value)) {
    if (value.length > 512) throw new RequestInputError(422, 'request array is too large');
    for (const child of value) boundedJson(child, depth + 1, seen);
  } else if (value && typeof value === 'object') {
    const object = record(value, 'nested value');
    if (Object.keys(object).length > 512) throw new RequestInputError(422, 'request object is too large');
    for (const child of Object.values(object)) boundedJson(child, depth + 1, seen);
  }
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && item.length > 0 && item.length <= 128)) {
    throw new RequestInputError(422, `${label} must be a bounded string array`);
  }
  return value;
}

function optionalInteger(value: unknown, label: string, min: number, max: number): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) throw new RequestInputError(422, `${label} is invalid`);
  return value as number;
}

export interface CreateGameBody {
  players: string[];
  seed?: number;
  maxTurns?: number;
  emails?: Record<string, string>;
  ai?: Record<string, string>;
  boardPreset?: string;
}

export function validateCreateGameBody(value: unknown): CreateGameBody {
  const body = record(value, 'body');
  exactKeys(body, ['players', 'seed', 'maxTurns', 'emails', 'ai', 'boardPreset'], 'body');
  const players = stringArray(body.players, 'players');
  if (players.length < 2 || players.length > 6 || new Set(players).size !== players.length) throw new RequestInputError(422, 'players must contain 2-6 distinct nation ids');
  const seed = optionalInteger(body.seed, 'seed', 0, 0xffff_ffff);
  const maxTurns = optionalInteger(body.maxTurns, 'maxTurns', 1, 1_000);
  if (body.boardPreset !== undefined && (typeof body.boardPreset !== 'string' || body.boardPreset.length > 128)) throw new RequestInputError(422, 'boardPreset is invalid');

  const stringMap = (candidate: unknown, label: string, maxLength: number): Record<string, string> | undefined => {
    if (candidate === undefined) return undefined;
    const map = record(candidate, label);
    if (Object.keys(map).some((key) => !players.includes(key))) throw new RequestInputError(422, `${label} contains an unknown seat`);
    if (Object.values(map).some((entry) => typeof entry !== 'string' || entry.length === 0 || entry.length > maxLength)) throw new RequestInputError(422, `${label} contains an invalid value`);
    return map as Record<string, string>;
  };
  const emails = stringMap(body.emails, 'emails', 254);
  const ai = stringMap(body.ai, 'ai', 64);
  return { players, ...(seed === undefined ? {} : { seed }), ...(maxTurns === undefined ? {} : { maxTurns }), ...(emails ? { emails } : {}), ...(ai ? { ai } : {}), ...(body.boardPreset === undefined ? {} : { boardPreset: body.boardPreset }) };
}

const ACTION_KEYS: Record<string, readonly string[]> = {
  setTaxRate: ['type', 'rate'], convertArea: ['type', 'area'], allocateLoss: ['type', 'allocation'],
  chooseCities: ['type', 'areas'], chooseUnits: ['type', 'tokens', 'cities', 'grainCommit'], chooseDiscard: ['type', 'cards'],
  civilWarSelect: ['type', 'tokens', 'cities'], civilWarKeep: ['type', 'faction'], pickAreas: ['type', 'areas'],
  placeTokens: ['type', 'placements'], move: ['type', 'moves'], buildShips: ['type', 'builds'], scrapShip: ['type', 'area'],
  resolveConflict: ['type', 'area'], buildCity: ['type', 'area', 'useTreasury'], drawTradeCards: ['type'],
  postOffer: ['type', 'give', 'wants'], respondOffer: ['type', 'offerId', 'give'],
  acceptResponse: ['type', 'offerId', 'responder'], withdrawOffer: ['type'], buyTradeCard: ['type', 'count'],
  resolveCalamity: ['type', 'calamityId', 'choices'], buyAdvance: ['type', 'advance', 'spendCommodities', 'spendTreasury'], pass: ['type'],
};

const ACTION_REQUIRED: Record<string, readonly string[]> = {
  setTaxRate: ['rate'], convertArea: ['area'], allocateLoss: ['allocation'], chooseCities: ['areas'],
  chooseUnits: ['tokens', 'cities'], chooseDiscard: ['cards'], civilWarSelect: ['tokens', 'cities'], civilWarKeep: ['faction'],
  pickAreas: ['areas'], placeTokens: ['placements'], move: ['moves'], buildShips: ['builds'], scrapShip: ['area'],
  resolveConflict: ['area'], buildCity: ['area'], drawTradeCards: [], postOffer: ['give', 'wants'],
  respondOffer: ['offerId', 'give'], acceptResponse: ['offerId', 'responder'], withdrawOffer: [], buyTradeCard: ['count'],
  resolveCalamity: ['calamityId'], buyAdvance: ['advance'], pass: [],
};

function numberMap(value: unknown, label: string): void {
  const map = record(value, label);
  if (Object.values(map).some((entry) => !Number.isSafeInteger(entry) || (entry as number) < 0)) throw new RequestInputError(422, `${label} is invalid`);
}

function tradeBundle(value: unknown): void {
  const bundle = record(value, 'trade bundle');
  exactKeys(bundle, ['actual', 'declared'], 'trade bundle');
  numberMap(bundle.actual, 'trade actual');
  numberMap(bundle.declared, 'trade declared');
}

function validateAction(value: unknown): Action {
  const action = record(value, 'action');
  if (typeof action.type !== 'string' || !ACTION_KEYS[action.type]) throw new RequestInputError(422, 'action type is invalid');
  exactKeys(action, ACTION_KEYS[action.type]!, 'action');
  for (const required of ACTION_REQUIRED[action.type]!) {
    if (action[required] === undefined) throw new RequestInputError(422, 'action payload is incomplete');
  }
  boundedJson(action);
  const stringFields = ['area', 'advance', 'responder', 'calamityId'] as const;
  for (const field of stringFields) {
    if (action[field] !== undefined && (typeof action[field] !== 'string' || action[field].length === 0 || action[field].length > 128)) throw new RequestInputError(422, `action ${field} is invalid`);
  }
  for (const field of ['rate', 'grainCommit', 'faction', 'useTreasury', 'offerId', 'count', 'spendTreasury'] as const) {
    if (action[field] !== undefined && (!Number.isSafeInteger(action[field]) || (action[field] as number) < 0)) throw new RequestInputError(422, `action ${field} is invalid`);
  }
  for (const field of ['areas', 'cities', 'cards', 'wants'] as const) {
    if (action[field] !== undefined) stringArray(action[field], `action ${field}`);
  }
  for (const field of ['placements', 'allocation', 'tokens', 'spendCommodities'] as const) {
    if (action[field] !== undefined) numberMap(action[field], `action ${field}`);
  }
  if (action.moves !== undefined) {
    if (!Array.isArray(action.moves)) throw new RequestInputError(422, 'moves must be an array');
    for (const item of action.moves) {
      const move = record(item, 'move item');
      exactKeys(move, ['from', 'to', 'count', 'via', 'byShip'], 'move item');
      if (typeof move.from !== 'string' || typeof move.to !== 'string' || !Number.isSafeInteger(move.count) || (move.count as number) < 1) throw new RequestInputError(422, 'move item is invalid');
      if (move.via !== undefined && typeof move.via !== 'string') throw new RequestInputError(422, 'move item is invalid');
      if (move.byShip !== undefined && typeof move.byShip !== 'boolean') throw new RequestInputError(422, 'move item is invalid');
    }
  }
  if (action.builds !== undefined) {
    if (!Array.isArray(action.builds)) throw new RequestInputError(422, 'builds must be an array');
    for (const item of action.builds) {
      const build = record(item, 'ship build');
      exactKeys(build, ['area', 'count', 'payFrom'], 'ship build');
      if (typeof build.area !== 'string' || !Number.isSafeInteger(build.count) || (build.count as number) < 1) throw new RequestInputError(422, 'ship build is invalid');
      if (build.payFrom !== undefined && build.payFrom !== 'area' && build.payFrom !== 'treasury') throw new RequestInputError(422, 'ship build is invalid');
    }
  }
  if (action.give !== undefined) tradeBundle(action.give);
  if (action.choices !== undefined) record(action.choices, 'calamity choices');
  return action as unknown as Action;
}

export interface MoveBody {
  action: Action;
  expectedTurn: number;
  requestId: string;
}

export function validateMoveBody(value: unknown): MoveBody {
  const body = record(value, 'body');
  exactKeys(body, ['action', 'expectedTurn', 'requestId'], 'body');
  const expectedTurn = optionalInteger(body.expectedTurn, 'expectedTurn', 0, Number.MAX_SAFE_INTEGER);
  if (expectedTurn === undefined) throw new RequestInputError(422, 'expectedTurn is required');
  if (typeof body.requestId !== 'string' || (!isSecureId(body.requestId) && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))) throw new RequestInputError(422, 'requestId is invalid');
  return { action: validateAction(body.action), expectedTurn, requestId: body.requestId };
}

export function validateInviteBody(value: unknown): string {
  const body = record(value, 'body');
  exactKeys(body, ['inviteToken'], 'body');
  if (!isSecureId(body.inviteToken)) throw new RequestInputError(401, 'invalid invitation');
  return body.inviteToken;
}

export function validateMessageBody(value: unknown): string {
  const body = record(value, 'body');
  exactKeys(body, ['body'], 'body');
  if (typeof body.body !== 'string' || body.body.trim().length === 0 || body.body.length > 500) throw new RequestInputError(422, 'message is invalid');
  return body.body;
}

export function validateClaimBody(value: unknown): string {
  const body = record(value, 'body');
  exactKeys(body, ['identityToken'], 'body');
  if (typeof body.identityToken !== 'string' || body.identityToken.length === 0 || body.identityToken.length > 8_192) throw new RequestInputError(422, 'identityToken is invalid');
  return body.identityToken;
}

export function validateResolutionBody(value: unknown): string {
  const body = record(value, 'body');
  exactKeys(body, ['note'], 'body');
  if (typeof body.note !== 'string' || body.note.length > 2_000) throw new RequestInputError(422, 'resolution note is invalid');
  return body.note;
}
