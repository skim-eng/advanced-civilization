# Project Chronicle charter

## Purpose

Project Chronicle will first establish a preserved, testable, privately staged copy of John Champaign's browser implementation of Advanced Civilization. Later work may use the validated multiplayer infrastructure as a test bed for an original game, but no original-game implementation is authorized yet.

## Current authorization

- Phase 0: preserve and audit the upstream baseline — active.
- Phase 1: local vanilla multiplayer validation — requires acceptance of Phase 0 before work begins.
- Phase 2: private vanilla staging deployment — requires acceptance of Phase 1 before work begins.
- Phases 3–14: roadmap documentation only.

## Current product targets

- Private vanilla staging: `https://civ-vanilla.kimsvideo.org`
- Eventual original-game target: `https://civ.kimsvideo.org`
- Original-game internal codename: **Project Chronicle**

## Non-goals for Phases 0–2

- No television-and-phone or Jackbox-style interface.
- No map redesign.
- No Advanced Civilization rules changes.
- No OpenAI API integration.
- No original simulation engine.
- No public release or link from the main Kim's Video site.

## Engineering principles

1. Human players are the strategic competitors.
2. The server is authoritative and performs all game-state arithmetic.
3. Deterministic, seeded resolution is reproducible and auditable.
4. Hidden information is projected server-side for the authorized viewer.
5. Browser clients remain lightweight.
6. External services are explicit, controlled, and least-privileged.
7. AI may eventually interpret, explain, propose, and narrate, but may never directly mutate game state or invent executable rules.
8. Complex outcomes must have player-readable causal explanations.
9. The eventual public product must be an original work.

## Phase-gate definition of done

A phase is complete only when its branch, written plan, focused commits, tests, diff review, and final report exist; required external resources are validated; failures are disclosed; and the report states PASS, CONDITIONAL PASS, or FAIL. The next phase does not begin without explicit owner approval.
