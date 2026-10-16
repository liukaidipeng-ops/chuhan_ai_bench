# Root upgrade-state rotation: fixed 600-game experiment

Question: does root upgrade-state rotation improve strength against the original 55919 baseline? Small diagnostic checks do not establish a strength improvement. This experiment is independent of the completed hard-vs-xhard 120-game run; results must not be pooled.

## Frozen inputs and review boundary

Inputs were read from public commit d5154c1471da42c8e8ee5a2359f046595128a6cf. Original baseline SHA256: 55919a98e4c668b3d40b40264339c27dea6d6b2e76c6fe8ab33be20ff32e11d3; public ai/baseline.js: cfc40355fa7d45d8bab7561a946621a92e643a452ca8301d8a544e915e114233. Original candidate SHA256: be3d77e503f38d322418049f96ba0c5f06788e9da139a6e9a5290aeaeeaf054d; public ai/candidate.js: 81b34222a0e06494e96e3fb4521eb28c72c7c2c2cd8e7384e3eded03542af314.

These public bytes were independently hash checked. evidence/publication-manifest.json is the exact publication receipt, whose canonical reprint and 12-position original/public behavior equivalence assertions were read. Those equivalence assertions are publisher evidence, not a local rerun on inaccessible original files. Actual public candidate/control isolation, traces and replay were checked locally and in GitHub.

The separate Library archive could not be materialized: official helper returned `library file transfer failed: download failed`; official read reported no readable ZIP content. Its EXPERIMENT_CARD and GATE_SUMMARY were not independently read here. A reported stale current/src/bfai.js manifest entry remains unverified. archiveManifestFullyVerified stays false. The explicit fixed-public-commit review route uses the frozen public files, publication receipt and independently checked cloud smoke; it does not claim full archive verification. No private archive is published.

## Design

300 unique seed pairs / 600 games, seeds 610160000–610160299. A=candidate and B=baseline, swapped colors for each seed. Both xhard: base budget9000ms, minNodes60000, native dynamic multiplier2.7, no fixed node cap or budget override, no opening AI. Native dynamic behavior means measured thinking time can differ from the base budget. Frozen rules/config/API are identical.

Each AI runs in its own child process. Inherited BFAI_/BFSIM_ overrides are removed. Candidate alone receives BFAI_ROOT_RR=1; baseline receives0. Each decision records loaded file SHA256, PID, flag and RNG seed. RNG seed is (imul(pairSeed,2654435761)+ply)>>>0, same schedule for both flips.

Three sequential blocks of100 pair jobs, maximum16 concurrent standard ubuntu-24.04 runners. Pair process deadline100min, job110min, maximum150 rounds/game. No optional stopping for win rate or games beyond300pairs. Errors stop the next block. Caps/stuck/probe are unresolved, never draws. Successful valid games must never be rerun. Recovery requires restoring prior complete evidence and explicitly selecting missing/error games after confirming previous processes stopped; no automatic whole-workflow retry is allowed.

## Evidence and free storage

Every game preserves source/rule/config/runner hashes, commit/runtime, seed/side, full action sequences, thinking start/end, actual nodes/depth/time, full think.last/iteration trace and native trace.why, terminal state/reason, truncation/error status. Replay and complete journal checks reject corrupt evidence. Partial attempts remain available. A completed journal can be recovered before checkpoint creation without replaying the game.

All evidence is gzip/base64 encoded into bounded GitHub job log lines, with archive and per-file SHA256 checks. There is no artifact upload and no cache. Public repository standard runner compute is free, and GitHub documentation excludes logs/job summaries from artifact storage allowance: https://docs.github.com/en/billing/concepts/product-billing/github-actions . Account artifact usage was not inspected and is not relied on. No paid runner, billing or permission change is involved.

Cloud smoke https://github.com/liukaidipeng-ops/chuhan_ai_bench/actions/runs/38877422166 succeeded:21 tests, two swapped one-round games at seed610159902, both unresolved and formalGames=0. Full evidence was retrieved from job116895729652, decoded and replayed locally. The environment reports log retention90days (required at least7), artifact count0. Archive SHA256=41f42e4aa7d30a4342e0d02df6ccefea98f0761c6434a1e61503f693ed288cd6. Detailed receipt: evidence/launch-gate-summary.json. Runtime rejects retention below7days. Evidence transport failure is an error, not permission to discard traces.

## Launch and analysis

The workflow triggers only when config/compare600-launch.json is created on bench/compare600-root-order. It verifies that no prior launch file existed, matches the exact config file SHA256, validates every gate and freezes the run commit. A commit preparing these files does not itself prove that a formal run started; consult the GitHub Actions run URL and status.

Retrieve each job log using authorized GitHub logs access, then decode with `node tools/trace-logpack.js decode JOB.log pair-INDEX OUTPUT_DIR`. Run `node tools/compare600-summary.js SUMMARY.json DECODED_ROOT...` from the frozen run checkout. It rejects duplicate pair directories and mismatched identities, validates games/journals/replay, reports by-color wins/losses/draws/unresolved, missing/error games and complete pairs. Pair-level score and approximate95% interval use fully resolved pairs only; missing/unresolved selection must be reported. No results from earlier experiments are combined. No superiority claim is made before the fixed endpoint and uncertainty analysis.
