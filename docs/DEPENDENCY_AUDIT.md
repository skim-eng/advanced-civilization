# Phase 1 dependency audit

Audit runtime: Node.js 24.14.0 and npm 11.6.2. Baseline lockfile: checkpoint `8689ec4b4ad26813e451be6df4bb45d683c8101d`.

## Baseline development findings

All seven `npm audit` vulnerability entries were in development/build/test dependencies. `npm audit --omit=dev` reported zero production findings before remediation. The affected tools are not imported by the production browser or Node runtime; Vite does, however, create the production browser bundle, so build-time integrity still matters.

| Vulnerability entry | Advisory identifier(s) | Dependency path | Severity | Reachability | Patched target used | Compatibility assessment |
|---|---|---|---|---|---|---|
| `@vitest/mocker` | Inherited Vite advisories below | root → `vitest@2.1.9` → `@vitest/mocker@2.1.9` → `vite@5.4.21` | Moderate | Test automation and CI only | `vitest@4.1.10` | Major test-runner update; verified against the complete repository suite. |
| `esbuild` | GHSA-67mh-4wv8-2f99 | root → `vite@5.4.21` → `esbuild@0.21.x` | Moderate | Development server, CI build, and production build; not browser runtime | `vite@8.2.1` (Rolldown-based dependency graph) | Major build-tool update; both builds and Playwright verified. |
| `nanoid` | GHSA-28wg-ghj8-5hjv; GHSA-2v37-7h3g-55p8 | root → `vite@5.4.21` → `postcss` → `nanoid@3.3.x` | High | Development server and build tooling; vulnerable custom generators are not application code | Removed vulnerable version through `vite@8.2.1` | Transitive-only; no application API compatibility surface. |
| `postcss` | GHSA-r28c-9q8g-f849; GHSA-fxqj-rqcc-2cmp | root → `vite@5.4.21` → `postcss@8.5.x` | High | Development server, CI build, and production build; not browser runtime | Removed vulnerable version through `vite@8.2.1` | Transitive-only; UI build output verified. |
| `vite` | GHSA-4w7w-66w2-5vf9; GHSA-v6wh-96g9-6wx3; GHSA-fx2h-pf6j-xcff; GHSA-67mh-4wv8-2f99 | root → `vite@5.4.21` | High | Development server, test automation, CI build, and production build; not browser runtime | `vite@8.2.1` | Major update and highest compatibility risk; dev proxy, custom logger, version stamp, build, and browser tests verified. |
| `vite-node` | Inherited Vite advisories above | root → `vitest@2.1.9` → `vite-node@2.1.9` → `vite@5.4.21` | Moderate | Test automation and CI only | Removed with `vitest@4.1.10` | Major runner update; explicit source-only test discovery prevents compiled tests from running twice. |
| `vitest` | GHSA-5xrq-8626-4rwp plus inherited Vite advisories | root → `vitest@2.1.9` | Critical | Test automation and CI; the vulnerable UI server is not used, but package code is installed | `vitest@4.1.10` | Major update; all source tests pass. No Vitest UI server is enabled. |

## Remediation and final result

The compatible group update pins `vite@8.2.1`, `vitest@4.1.10`, and `@vitejs/plugin-react@6.0.5`. It does not use `npm audit fix --force` or accept peer-dependency overrides. A fresh lockfile was generated because npm 11 could not reconcile the old installed Vite 5 peer tree in place; `npm ci` then reproduced the new tree from the committed lockfile.

Final targets:

- `npm audit`: zero production or development vulnerabilities.
- `npm audit --omit=dev`: zero production vulnerabilities.
- Source test discovery is pinned to `src/**/*.test.ts`; generated `dist/**/*.test.js` files are excluded.
- Required compatibility commands: `npm ci`, both audit targets, full tests, typecheck, server build, UI build, and Playwright.
