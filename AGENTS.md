# Project Chronicle engineering rules

These instructions apply to the entire repository.

## Scope and change control

- Work only in the phase that the project owner has explicitly approved.
- Preserve John Champaign's upstream Git history, MIT license, and copyright notice.
- Keep gameplay-rule work separate from infrastructure, deployment, security, and presentation work.
- Do not rewrite, squash, or force-push the archived upstream baseline.
- Record behavior changes in `docs/VANILLA_DEVIATIONS.md`; record architecture decisions in `docs/DECISIONS.md`.
- Use small, reviewable commits and a clearly named branch for every phase.

## Game integrity

- Preserve deterministic seeded behavior. All authoritative randomness must flow through a serialized, seeded RNG.
- Keep the server authoritative for online play. Clients may propose actions; they may not decide whether an action is legal or directly mutate persisted state.
- Never expose another player's hand, calamities, private offer contents, private messages, seat token, or other hidden state.
- Enforce and test permission and hidden-information boundaries at the server response level. CSS hiding is not security.
- Add tests for every new permission, authentication, game-isolation, or hidden-information boundary.
- Never implement game effects through `eval`, generated JavaScript, dynamically generated SQL, or unvalidated model output.

## Secrets and external services

- Never put a service key or server credential in client code or a `VITE_` variable.
- Never commit passwords, private game tokens, API keys, Supabase service-role keys, Cloudflare tokens, Resend keys, production credentials, or generated credential files.
- Use environment variables and provider secret stores. Keep `.env*`, `.dev.vars*`, `.wrangler/`, key files, and credential exports ignored, except the placeholder `.env.example`.
- Do not enable an upstream identity, analytics, leaderboard, report, email, or other external service by default. Every outbound service must be owned by this project or explicitly approved and feature-flagged.
- Redact bearer tokens and credentials from logs, screenshots, error reports, and test artifacts.

## Intellectual-property boundary

- Do not download, commit, deploy, or serve the Advanced Civilization VASSAL module or extracted board artwork.
- Retain the bring-your-own-module flow: processing stays in the user's browser and artwork stays on that device.
- Do not treat the MIT license on repository code as a license to the underlying game, branding, data, rules wording, or artwork.

## Required verification

Before completing a code or infrastructure task, run and report:

1. `npm test`
2. `npm run typecheck`
3. `npm run build`
4. `npm run build:ui`

Also run phase-specific integration, browser, security, and deployment tests. Never report success for a check that was not actually executed. Preserve upstream failures as evidence rather than changing rules or weakening tests.

## Documentation

- Update `docs/ARCHITECTURE_CURRENT.md` when data flow, persistence, hosting, or trust boundaries change.
- Update `docs/DECISIONS.md` for consequential technical choices.
- Update `docs/KNOWN_ISSUES.md` and the current phase report with failures and limitations.
- Keep commands, exit codes, tested commit SHAs, environments, and evidence in the applicable phase report.
