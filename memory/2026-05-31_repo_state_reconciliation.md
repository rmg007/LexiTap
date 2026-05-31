# Repo State Reconciliation — 2026-05-31

Session purpose: doc/config **integrity sweep**. The planning/doc layer had drifted
from the filesystem badly enough to be a hallucination trap. Root cause turned out
to be a **30% of "missing" state living on an unmerged branch** — see below.

## Root cause: the auto-memory described BRANCH state as if it were master

The home auto-memory (RELEASE_PLAN, words.db bundled, 3-SKU tiers, green tests) was
all real — committed on branch `fix/words-db-delivery-and-monetization` (`5f3ff28`,
authored off `7ab7b38` before master's AsterKit doc commits) but **never merged**.
master looked broken/empty only because it lacked that branch. **Merged into master
this session** (merge commit, no conflicts, disjoint files). Confirmed `npm run
check` green on the branch (132 tests, 15 suites) before merging.

## Ground truth (post-merge)

- **Mobile app is built**, not vaporware: ~120 TS files, clean/hexagonal layers
  (`domain` / `application` / `infrastructure` / `presentation`) + expo-router
  routes in `mobile/app/`. DI container (`composition/container.ts`), not
  Zustand/Redux/TanStack. Matches AGENTS.md (which is accurate — trust it).
- **Content DELIVERY now solved (C0):** `words.db` bundled at
  `mobile/assets/vocab/words.db` + `expo-asset`/metro/`contentDb.ts` install flow.
  ⚠️ unverified on a physical device (tests use fakes).
- **Content VOLUME is the remaining launch blocker (C1):** bundled db holds only
  ~216 words (~7%) — must be enriched + rebuilt via `content-tool`.
- **Monetization half-done:** `tiers.ts` = locked 3-SKU model, but bundled
  `content_tiers` rows still encode the OLD per-tier model → rebuild `words.db`.
- Roadmap "~85%" (code skeleton) and "~30% to launch" reconcile: skeleton + delivery
  done, but content volume / device-verify / auth / EAS still outstanding.

## What was wrong and got fixed this session

- `.claude/settings.json` deny-list pointed at 3 non-existent paths
  (`application/paywall`, `utils/storage.ts`, `app.config.ts`) → corrected to real
  paths (`infrastructure/iap/`, `infrastructure/storage/`, `app.json`).
- `CLAUDE.md` referenced ghosts: `docs/`, `mobile/CLAUDE.md`,
  `content-tool/CLAUDE.md`, `plans/ROADMAP.md`, `plans/LESSONS_LEARNED.md`,
  `npm run build`, `app.config.ts` → all corrected to real targets.
- CLAUDE.md documented root `npm run check`/`dev`/`build`, but there is **no root
  `package.json`** — scripts run per sub-project (`cd mobile && npm run check`).
  Corrected the Root Commands section. (A mid-session claim that root package.json
  had a misplaced `workspaces` key was MY error from garbled tool output — no such
  file exists. Treat any single-channel `cat`/`git show` output this session with
  suspicion; cross-check with a subagent.)
- `plans/next_prompt` was a greenfield "scaffold from scratch" directive
  (Zustand + TanStack + RN Paper) that **contradicted AGENTS.md** → rewrote to
  reflect the built app + name content as the real next blocker.

## Follow-ups (NOT done this session)

- **Verify C0 on a physical device** — prove asset→copy→ATTACH actually loads
  content. Unit tests use fakes; the real path is unproven.
- **Rebuild `words.db`** so `content_tiers` matches the locked `tiers.ts` 3-SKU
  model, and enrich content volume past ~7% (task C1).
- **Home-folder auto-memory** (`~/.claude/projects/.../memory/`) duplicates project
  knowledge (violates "project memory lives in committed `memory/`"). Its
  `RELEASE_PLAN.md is authoritative` pointer is now CORRECT post-merge (the file
  exists). Still, migrate those notes into committed `memory/` and trim later.
- GitHub Issues queue is empty (CLAUDE.md says it's the work queue) — use
  `plans/RELEASE_PLAN.md` until Issues are populated.

## Tooling note (this session)

- The Bash tool channel was unreliable — it fabricated a non-existent root
  `package.json`, replayed stale `git log`/`status`, and reported a phantom merge
  success. Subagents (Agent tool) returned coherent, trustworthy output every time.
  When direct Bash output looks contradictory, verify via a subagent.

Related: [[2026-05-31_asterkit_integration]]
