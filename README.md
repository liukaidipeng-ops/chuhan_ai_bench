# ChuHan AI benchmark

A standalone, source-only benchmark for two frozen chess AIs. No website, assets, private records, upstream git history, credentials or private-repository downloads are included. Runtime dependencies: **Node.js 22 or newer, built-in modules only**. No `npm install` is needed.

## Frozen baseline

Rules, candidate, baseline and opening AI all freeze production source commit `e5c430b084e4e157d5de12c5623ad862c866b3c5`. The consecutive-check limit is **3**. Candidate and baseline are intentionally identical: this first smoke validates infrastructure, not an AI improvement. C61 and C68 are already included; no AI algorithm or gameplay change is introduced. The simulator originates from `ecdb26ec9029563a06a393423b923cc89ff65468` with local loading and measurement adaptations.

Original source blob IDs and transformed SHA-256 digests are in `config/manifest.json`. Comments were removed with a JavaScript parser, with compression and name mangling disabled. No external weights, private git lookup or token is needed.

This is a **new current-production experiment**. Historical H70 uses a different rule baseline and must remain separate: do not pool its scores, pairs or artifacts into this experiment. No historical private game records are included. Actual node totals may exceed requested search budgets because the engine performs additional checks; both are reported. A configured node count alone does not establish cross-machine reproducibility.

## Bounded local smoke

```bash
npm run verify
npm test
npm run smoke
```

The smoke runs exactly one swapped pair (seed 500006), hard 100k nodes, a shared 10-ply opening at 60k nodes, two workers, and a **12-round cap**. It checks infrastructure, legality and paired openings; cap results are unresolved, never formal draws or strength evidence. The original simulator's printed statistics may count caps as draws; the authoritative `results/summary.json` explicitly excludes them.

```bash
node tools/pairs.js --seeds 500006 --out results
```

Running this command again validates and skips an existing complete pair. Locally, at most three unique seeds from 500000–500299 may be requested per invocation. No 600-game option or qualification workflow is enabled. Unexpected AI environment overrides are rejected.

Each pair is validated and atomically saved before the next one begins. Pair identity includes code hashes, parameters, exact Node version, platform, architecture and CPU model. A restored result with a different identity, duplicate side, error, or mismatched actual opening fails closed. Logs/errors and previously completed pairs survive a later pair failure. Each pair subprocess has a three-minute limit.

The candidate is match[0]: red when flip=false, black when flip=true. Color win counts and candidate-version score are reported separately. No Elo or strength acceptance is claimed for smoke data.

## GitHub Actions

Only the manually dispatched **Paired AI smoke** workflow is configured. It runs one paired seed on standard `ubuntu-24.04`, Node 22, with a ten-minute job timeout and one active job per repository. There is no schedule, push trigger, deployment, git push, larger runner, or private-source download. The job refuses to run if this repository is not public.

For resume, provide a previous run ID and its exact attempt from this same repository. Only that exact artifact is restored, avoiding same-name collisions across attempts; the pair is checked before being skipped. This uses only GitHub's built-in ephemeral read token, with no user credential or private-repository token.

Artifacts are uploaded even on failure and retained for **one day** (the shortest supported whole-day retention). Download needed results promptly. Public standard runner minutes are free under GitHub's published policy; this is not a promise that all storage or other services are free. No paid runner or external service is used. A future full experiment requires separate baseline selection, qualification gates and authorization.

See `NOTICE.md` for publication and license scope. Publication does not select a new open-source license.

## Latency and design experiments

Each decision records wall-clock milliseconds, actual nodes/depth, side, AI identity and all actions. The summary reports p50/p95/p99/max separately for opening, candidate and baseline; capped openings are not a claim about late-game or mobile latency. Per-game mechanism use, upgrades, damage, kills, counters and merit sources are retained. Every completed pair is replayed against the frozen rules and checked against its full final state.

For future skill or combination experiments, first add fixtures proving the AI can choose, use and counter the proposed mechanism; otherwise a low observed win rate may reflect AI ignorance rather than balance. Then compare benefits/counters, first/second-player outcomes and speed under separately hashed configurations with matched openings. No bonds, new skills or configurable production gameplay are implemented here. The present smoke profile remains fixed and full qualification disabled.
