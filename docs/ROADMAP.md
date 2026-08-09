# Project Chronicle roadmap

Only Phase 0 is active. Phases 1–2 require sequential owner acceptance. Phases 3–14 are product and engineering direction only; they are not authorization to implement.

## Phase 0 — Preserve and audit the vanilla baseline

Pin John Champaign's exact upstream commit, preserve history with archive refs, verify the untouched dependency lock and builds, audit architecture/security/IP, and create the engineering record. Current result: conditional pass; see `VANILLA_BASELINE_REPORT.md`.

## Phase 1 — Local vanilla multiplayer validation

Run Node API and Vite separately, document proxy and filesystem persistence, and manually validate landing, hotseat, human-versus-AI, schematic board, a legal action, actor advancement, refresh, and console health. Add Playwright in a separate focused commit with isolated player contexts and deterministic seeds. Cover 2/4/6 players, invitation isolation, raw server redaction, move ownership, reconnect, polling, Realtime, concurrency, refresh durability, failure handling, and artifact leakage. Add CI and a real-device checklist. Repair critical baseline security findings without changing vanilla rules.

## Phase 2 — Private vanilla staging deployment

Deploy the supported Cloudflare Pages/Functions + Supabase architecture to owner-controlled resources, initially at a private Pages URL and then `civ-vanilla.kimsvideo.org`. Apply a reviewed schema, keep the service role server-side, gate the full site with Cloudflare Access, disable indexing and upstream services, add security headers, validate 2/4/6-player behavior in production, measure Realtime/polling, run a limited ten-game soak test, document rollback, and issue a vanilla staging acceptance report.

## Phase 3 — Vanilla second-screen prototype

Use unchanged vanilla Advanced Civilization rules only as a presentation test bed. Add a host-controlled lobby, short room and QR codes, separate host/read-only-public-display/private-seat credentials, a public television display, and private phone controllers. Phones cover cards, census, AST, score, advances, trade, and map interactions; territory selection mirrors to TV. Generate distinct `PublicGameView` and `PlayerGameView` server-side so private state never reaches TV. Add reconnect/seat recovery and Playwright contexts for TV, host, and multiple phones. Keep the desktop UI as fallback.

## Phase 4 — Architecture decision for the original game

Do not keep layering incompatible systems onto the sequential Advanced Civilization engine. Evaluate reuse of lobby, seat auth, hidden projections, persistence, deterministic RNG, reports/logs, map interaction, browser clients, and Realtime. Design a new deterministic simulation core and write an ADR for repository/module boundaries. A possible shape includes separate TV/mobile/host/server apps and packages for simulation core, world model, trade contracts, policy DSL, story director, shared protocol, map data, and test harness, but the decision must follow measured needs rather than copy this layout blindly.

## Phase 5 — Asynchronous simultaneous campaigns

Implement configurable one-hour, four-hour, 24-hour, and live windows; simultaneous revise-until-deadline orders; early resolution when all players are ready; office hours and overnight/weekend/holiday pauses; grace-time banks; safe missed-turn defaults; temporary AI substitution; deterministic idempotent scheduled resolution; round snapshots; replay; public recap; and private result reports. The server resolves the world.

## Phase 6 — Original expandable world

Replace Advanced Civilization material with original modular regions, civilizations, exploration, per-player knowledge, fog of war, stale information, scouts, ships, merchants, diplomatic mapping, expandable map modules, original resource locations, and original artwork/labels.

## Phase 7 — Economic and technological simulation

Build causal aggregate simulation rather than millions of individuals: regional cohorts, food security, production/input chains, infrastructure, markets/prices, transport costs, routes/capacity, tariffs, blockades, migration, urbanization, health, finance/debt, administrative capacity, technology/institution diffusion, military supply, and hazard/exposure/preparedness disasters. Prefer connected consequences over hundreds of interchangeable resources. Every important result needs a player-readable explanation.

## Phase 8 — Human-to-human trade

Keep human players as the principal competitors. Combine spot markets for ordinary liquidity with direct strategic contracts covering multi-round delivery, fixed/indexed prices, transit/port rights, technology licenses, loans/collateral, embargoes, insurance, emergency aid, treaty conditions, joint infrastructure, atomic settlement, breach/default, and pre-signing forecasts. AI may translate or explain agreements but must not replace human negotiation.

## Phase 9 — Natural-language law and treaty compiler

Compile a request such as “Impose a 50% tariff on wheat imported from Player 1” through:

`natural language → typed PolicyDraft → ambiguity/authority checks → deterministic validation → forecast → explicit confirmation → enacted PolicyRule → deterministic simulation → permanent audit log`.

Define approved primitives including Tariff, Tax, Subsidy, Quota, Ban, Price Control, Procurement, Reserve, Transit, Transfer, Conscription, Priority, Conditional, Treaty, Enforcement, Exemption, and Duration rules. Every law specifies jurisdiction, scope, target, condition, action, magnitude, payer, beneficiary, duration, exemptions, enforcement, administrative burden, authority, conflicts, and repeal behavior. Offer interpretations for ambiguity and feasible alternatives for impossible requests.

Never use `eval`, arbitrary generated JavaScript, dynamic SQL, model-created numeric modifiers, or direct model state writes. At implementation time, use the then-current official OpenAI Responses API with strict Structured Outputs/function schemas, server-side only; the API key never reaches a browser.

## Phase 10 — Deterministic story director

Before generative narrative, build causal event eligibility, tension/recovery pacing, budgets, cooldowns, regional/global pressure, economic vulnerability, unresolved threads, fair multiplayer targeting, seeded selection, public/private projections, hand-authored archetypes, and complete audit logs. Events arise from actual exposure and player-created conditions; leadership alone is not a punishment trigger.

## Phase 11 — Generative narrative

After the deterministic director is reliable, allow schema-constrained proposals for event prose, diplomatic letters, merchant petitions, rumors, public recaps, private reports, temporary organization names, limited historical individuals, and follow-up variants. The deterministic engine validates effects. The model never calculates prices/casualties, invents bonuses or mechanics, exposes private information, mutates state, or chooses the winner. Persist every accepted event as campaign data; never depend on model memory.

## Phase 12 — Adaptive experience

Permit bounded adaptation to campaign state, group pacing, explanation depth, notification frequency, campaign tone, scenario variety, and decision load. Never silently change rules or target a leader with disasters. Use offline analytics and versioned balance updates, not live self-modifying rules.

## Phase 13 — Modern map and graphics

Separate graphics from simulation. TV may use an original, 4K-readable 2.5D/3D strategy map with terrain/elevation, animated water, borders, settlements, routes, weather, movement previews, and smooth camera. Phones use a lightweight vector/simplified map with large touch targets, private information, and low battery/GPU use. Do not copy commercial game assets or interfaces; use original or properly licensed art.

## Phase 14 — Original public release

Before public/commercial release, remove Advanced Civilization branding, extracted map/card data, original commodities/advances/calamities/AST/scoring/rules text, and expressive artwork/terminology. Retain applicable MIT attribution for reused code. Complete security, privacy, IP, multiplayer, load, accessibility, and disaster-recovery reviews. Public release requires an original work, not a public reskin.

## Enduring product principles

- Humans compete; AI assists with interpretation, explanation, proposals, and narration.
- The authoritative simulation is deterministic, auditable, and server-side.
- Natural-language inputs compile into validated typed structures, never executable model output.
- Human strategic trade remains superior to fully automated markets in important cases.
- Depth comes from causal interconnection rather than resource-count inflation.
- Public TV and private phones receive separate server projections.
- Every permission, hidden-information boundary, law, treaty, event, and AI interpretation is testable and auditable.
