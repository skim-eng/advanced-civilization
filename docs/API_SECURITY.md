# Phase 1 API request and error policy

## Request envelope

- POST requests require `Content-Type: application/json`.
- The maximum encoded JSON body is 65,536 bytes. Declared and streamed sizes are both checked.
- Empty and malformed JSON are rejected before routing.
- JSON depth is capped at 10, aggregate nodes at 2,000, object/array entries at 512, and individual strings at 4,096 characters unless an endpoint has a smaller limit.
- Creation, invitation exchange, moves, messages, identity claims, and report resolutions use endpoint-specific allowlists. Unsupported fields and unexpected nested fields are rejected.
- Messages are capped at 500 characters. Player reports are disabled and therefore accept zero bytes of report data beyond the transport-level request parser.

## Move integrity

Each move carries the last server snapshot turn observed by the client (`expectedTurn`) and a cryptographically random request ID. The server authenticates the seat, compares the expected turn to current authoritative state, and only then calls the existing engine/framework submission path. Missing/invalid revisions or request IDs fail validation. Stale and duplicate retries return `409`; concurrent same-turn requests still rely on the snapshot store's unique `(game_id, turn)` write as the final atomic guard. Tests verify that exactly one transition commits.

The request ID is correlation material only and is neither logged nor trusted for authorization. Revision checking supplies retry safety without changing action legality or gameplay.

## Safe errors

Validation errors use fixed bounded messages and 4xx status codes. Authentication, not-found, turn ownership, illegal-action, and conflict errors use fixed public text. Unknown framework, database, network, or persistence errors return `503 request could not be completed`; raw exception objects, stack traces, SQL details, credentials, snapshots, cards, and service configuration are not serialized.

Node and Pages body parsers use the same limits and messages. API responses set `Referrer-Policy: no-referrer`; the Node host also sets `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.
