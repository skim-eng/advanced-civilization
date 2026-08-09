# Phase 0 plan — preserve and audit the vanilla baseline

Branch: `chore/vanilla-baseline`

1. Establish provenance: fetch John Champaign's repository as `upstream`, record its default branch and exact SHA, and create an archive branch and annotated tag without rewriting history.
2. Verify the untouched baseline: clean install, test, typecheck, server build, UI build, bundle measurement, and dependency audit.
3. Audit architecture: engine, server, client, Pages Function, persistence, authorization, redaction, polling, Realtime, reports, identity, leaderboard, outbound network traffic, and board-art handling.
4. Audit licensing, game-data provenance, artwork handling, secrets, and environment-variable boundaries.
5. Create the durable engineering record required by the project charter.
6. Re-run verification, review the diff against the exact upstream SHA, make focused commits, publish the archival refs and phase branch to the owner's fork, and open a Phase 0 pull request.
7. Stop after `docs/VANILLA_BASELINE_REPORT.md`; do not begin Phase 1 without explicit approval.

Publishing steps in item 6 require an authenticated GitHub account and an owner-controlled fork. Their current status is recorded in the baseline report.
