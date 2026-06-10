# LexiTap — Orchestration (execution layer)

> **What this is.** The single, living list of every remaining unit of work to ship LexiTap, each as a **runnable prompt** with machine-readable metadata. This is the *execution* altitude of the three-tier system:
>
> | Altitude | File | Answers | Maintained by |
> |---|---|---|---|
> | **Glance** | [`ROADMAP.md`](ROADMAP.md) | what phase, which gate | `/orchestrate` |
> | **Execution** | **this file** | what to run next, in what order, what's parallel | `/orchestrate` |
> | **Detail** | [`plans/*.md`](plans/) | *why* + *how* for risky pieces | human + `/plan` |
>
> **It is living, not static.** Prompts encode assumptions about repo state *at execution time*. A prompt written months ahead rots (this project's own history: the "30%" staleness, the `// Stub until Screen 6` lie). So far-phase tasks are deliberately **stubs** — `/orchestrate` expands them into full grounded prompts only when their dependencies land and the real state is known. **Do not pre-write Phase 4–6 prompts.** Let the frontier advance.
>
> **The loop:** pick a `ready` task → run its prompt (in a worktree if `parallel_safe` and running alongside others) → on finish, invoke **`/orchestrate sync`** → it flips status, unblocks dependents, regenerates any downstream prompt whose assumptions changed, appends a `memory/` note, and re-syncs the roadmaps. Nothing is updated by hand.

---

## Schema (every task block carries this)

```
id            stable short id (PHASE-N), referenced by depends_on — never reused
phase         release phase (1–6), per ROADMAP / RELEASE_PLAN
status        ready | blocked | in-progress | done   (see flow below)
owner         agent | ryan | both     — HONEST about what a human must do
depends_on    [ids] that must be `done` first (hard edges)
blocked_by    free-text external blocker (account, payment, device) when owner=ryan
parallel_safe true | false  — true ONLY if paths are disjoint from every other in-flight task
paths         repo paths this task writes — the collision key (see Parallel rules)
verify        the concrete green/pass condition that closes the task
```

**Status flow:** `blocked` → (deps done) → `ready` → (picked up) → `in-progress` → (`verify` passes + `/orchestrate sync`) → `done`. A task may regress `ready`→`blocked` if a dependency is reopened.

## Parallel rules (load-bearing — this repo's #1 repeated lesson)

`parallel_safe: true` is **necessary but not sufficient**. Two tasks may run concurrently only when **all** hold:

1. Their `paths` sets are **disjoint** (no shared file or dir). The metadata makes this checkable, not a guess.
2. Each agent runs in its **own git worktree** (`Workflow` tool `isolation: worktree`, or a manual `git worktree`). Never two writers on one checkout — that entangled the C6–C8 commits and is banned by `guardrails.mjs` (`git add -A`/`commit -a` hard-blocked).
3. Each stages **explicit paths** at commit, never broad-add.

Shared barrels (`domain/index.ts`, `mobile/package.json`, both `ROADMAP.md`s) are **serialization points** — only one task may touch them at a time, regardless of `parallel_safe`.

---

## ▶ Ready now (the current frontier)

Agent-doable, dependencies met, **paths disjoint → safe to run in parallel worktrees today:**

| id | task | paths | parallel batch |
|---|---|---|---|
| `E2E-1` | Maestro learn-loop flow (write; verify needs a build) | `mobile/.maestro/` | A |
| `CONTENT-1` | content-tool synthesis + validator remainder | `content-tool/src/` | A |
| `LEGAL-2` | finish/verify 16+ age gate | `mobile/app/onboarding/`, `mobile/src/.../onboarding/` | A |
| `STORE-3` | `expo-doctor` sweep + SDK-upgrade eval (report only) | *(read-only audit)* | A |

**Ryan-only, unblocks the most downstream — do these first, no agent can:**

| id | task | blocked_by |
|---|---|---|
| `BUILD-1` | EAS build → C0 on-device smoke | physical device + Apple dev acct |
| `CONTENT-2` | Phase 2 paid enrichment run | paid API spend + model choice |

> Everything in Phase 3+ is `blocked` until `BUILD-1` and the content tasks clear. Their prompts are stubs by design.

---

# Phase 1 — Build (finish the gate)

### E2E-1 · Maestro learn-loop end-to-end flow
```
id: E2E-1   phase: 1   status: ready   owner: agent
depends_on: []     parallel_safe: true   paths: [mobile/.maestro/]
verify: `learn-loop.yaml` written + lints; runs green once a sim build exists (BUILD-1)
```
**Prompt:**
> Read `plans/RTL_RENDER_HARNESS_PLAN.md` §3 and the existing `.maestro/smoke.yaml`. Add `.maestro/learn-loop.yaml`: launch the app in a state past onboarding (seed or tap through), tap "Learn new words", advance through the batch, **assert the Quick-check screen is visible**, answer a question, assert return to Home. This is the native-layer proof the RTL harness can't give. It cannot be *run* green until a sim build exists (`npm run smoke` / `BUILD-1`) — write it, lint the YAML, and leave it ready. Do **not** touch any `.tsx` or production source. On finish: `/orchestrate sync`.

### CONTENT-1 · content-tool synthesis + validator remainder
```
id: CONTENT-1   phase: 1   status: ready   owner: agent
depends_on: []   parallel_safe: true   paths: [content-tool/src/]
verify: content-tool `npm run check` green; validator covers rich-sense rows; synthesis emits the ingest format
```
**Prompt:**
> The Phase-1 ingest *write* path for rich word senses landed (`3da68ea`, `ingest-senses.ts`). Finish Phase 1 of `plans/RICH_WORD_DETAIL_PLAN.md`: the **synthesis** side (types + any generator that emits the `sense-senses.jsonl` ingest format) and the **validator** coverage for sense/example rows, co-designed with the now-known ingest format. Stay entirely in `content-tool/src/`. Do not run any paid enrichment (that's `CONTENT-2`, Ryan's). `npm run check` must stay green. On finish: `/orchestrate sync`.

### LEGAL-2 · 16+ age gate — finish + verify
```
id: LEGAL-2   phase: 1   status: ready   owner: agent
depends_on: []   parallel_safe: true   paths: [mobile/app/onboarding/, mobile/src/presentation/screens/onboarding/]
verify: age gate blocks <16, persists, has a render test; mobile `npm run check` green
```
**Prompt:**
> `mobile/app/onboarding/age.tsx` exists. Audit it against the requirement (16+ gate, required pre-launch). Confirm it blocks under-16, persists the result, and is reachable as the first onboarding step. If gaps exist, fix them; add a render test (the RTL harness now exists — `*.render.test.tsx`). Stay in the onboarding paths. `npm run check` green. On finish: `/orchestrate sync`.

### STORE-3 · expo-doctor + SDK-upgrade evaluation
```
id: STORE-3   phase: 1   status: ready   owner: agent
depends_on: []   parallel_safe: true   paths: []   (read-only audit → writes a memory note only)
verify: a memory note enumerating expo-doctor findings + a keep/upgrade recommendation with reasons
```
**Prompt:**
> Run `npx expo-doctor` in `mobile/`. Triage every finding against the known-benign list in memory (the `metro@0.84.4` false-positive, the Expo-pinned transitive Dependabot set). Produce a `memory/` note: what's real, what's benign-and-why, and whether an SDK bump is warranted before launch (note: Expo major bumps are effectively forbidden mid-cycle per memory). Audit only — change no config. On finish: `/orchestrate sync`.

### BUILD-1 · EAS build → C0 on-device smoke  ⚑ THE GATE
```
id: BUILD-1   phase: 1   status: ready   owner: ryan
depends_on: []   parallel_safe: false   paths: [mobile/]   blocked_by: physical device + Apple dev account
verify: app cold-launches on a real device; learn flow → quick-check appears → an srs_state row is written
```
**Prompt (for Ryan, not an agent):**
> `cd mobile && eas build --platform ios --profile preview`, install on a physical device. Cold-launch → tap through onboarding → "Learn new words" → advance the batch → confirm Quick-check appears → answer → confirm an `srs_state` row was written (the only true proof of native + DB + SRS). RTL/Maestro prove wiring; only this proves the device. **Unblocks all of Phase 3+.** On finish: tell the agent → `/orchestrate sync`.

---

# Phase 2 — Content (the long pole) + Beta

### CONTENT-2 · Phase 2 paid enrichment run
```
id: CONTENT-2   phase: 2   status: blocked   owner: ryan
depends_on: [CONTENT-1]   parallel_safe: false   paths: [content-tool/, mobile/assets/vocab/words.db]
blocked_by: paid API spend + top-tier model choice
verify: top-N words enriched with rich senses; validate --strict clean; words.db rebuilt + copied to mobile
```
**Stub:** real "seedings" — top-N by frequency, top-tier model (cheap bulk = slop on "feel it", per Ryan). Expand to a full prompt via `/orchestrate` once `CONTENT-1` lands and the run parameters (N, model, budget) are chosen.

### CONTENT-3 · Exam-pack word-list sourcing (TOEFL/IELTS)
```
id: CONTENT-3   phase: 2   status: blocked   owner: ryan
depends_on: []   parallel_safe: true   paths: [content-tool/data/input/]
blocked_by: sourcing decision (which lists)
verify: exam-tier CSVs populated (currently stubs); import + validate green
```
**Stub:** the paid exam tiers are still stubs. Source lists → import → enrich. Expand when sourcing is decided.

### CONTENT-4 · Universal audio (neural TTS)
```
id: CONTENT-4   phase: 3   status: blocked   owner: ryan
depends_on: [CONTENT-2]   parallel_safe: false   paths: [content-tool/]
blocked_by: Polly/Google TTS account (~$10) — NOT ElevenLabs (per decision)
verify: word + sentence audio generated for shipped content; bundled
```
**Stub:** expand after content is firm.

### BETA-1 · TestFlight + Play Internal distribution
```
id: BETA-1   phase: 2   status: blocked   owner: ryan
depends_on: [BUILD-1]   parallel_safe: false   paths: []
verify: build distributed to internal testers on both tracks; analytics/Sentry events arriving
```
**Stub:** see `plans/P2_BETA_PLAN.md`. Expand after `BUILD-1`.

### BETA-2 · Recruit 50 beta testers
```
id: BETA-2   phase: 2   status: blocked   owner: ryan
depends_on: [BETA-1]   parallel_safe: true   paths: []
verify: 50 testers enrolled; D7 retention measurable (gate: D7 > 30%)
```
**Stub:** see `plans/P2_RECRUITMENT_CHECKLIST.md`.

---

# Phase 3 — First Paid Pack (Monetization + Auth)

### RC-1 · RevenueCat account + product config
```
id: RC-1   phase: 3   status: blocked   owner: ryan
depends_on: [BUILD-1]   parallel_safe: true   paths: [mobile/eas.json]
blocked_by: RevenueCat account; App Store Connect + Play Console products
verify: exam_* + all_exams products + entitlements configured; keys in EAS secrets
```
**Stub:** see `plans/P3_REVENUECAT_PLAN.md`.

### IAP-1 · Wire RevenueCat into paywall + restore + entitlement gating  ⚠ high-risk path
```
id: IAP-1   phase: 3   status: blocked   owner: agent
depends_on: [RC-1]   parallel_safe: false   paths: [mobile/src/infrastructure/iap/, mobile/src/presentation/screens/PaywallScreen.tsx]
verify: purchase → entitlement unlocks pack; restore works; StubIap still default when unconfigured; npm run check green
```
**Stub:** `RevenueCatIapService.ts` exists; app runs `StubIapService`. `infrastructure/iap/` is a **confirmation-gated high-risk path** — expand with care once `RC-1` provides real products.

### AUTH-1 · Native Google Sign-In + Sign in with Apple (Guideline 4.8)
```
id: AUTH-1   phase: 3   status: blocked   owner: both
depends_on: [BUILD-1]   parallel_safe: false   paths: [mobile/src/infrastructure/auth/, mobile/app.config.ts]
blocked_by: native modules require a dev/prod build; Apple requires SIWA whenever Google offered
verify: both native flows complete; session persists; magic-link still works
```
**Stub:** AU2/AU3, deferred to pre-submission. See `plans/P3_AUTH_PLAN.md`.

### BACKUP-1 · Verify encrypted backup against authenticated uid
```
id: BACKUP-1   phase: 3   status: blocked   owner: agent
depends_on: [AUTH-1]   parallel_safe: true   paths: [mobile/src/infrastructure/backup/]
verify: backup/restore round-trips against the real authenticated user id on device
```
**Stub:** BK1/BK2 shipped; this is the device round-trip verification. See `plans/P3_BACKUP_PLAN.md`.

---

# Phase 4 — Launch Wave Packs

### CONTENT-5 · IELTS / Business / GRE / GMAT pack enrichment — **stub**
### IAP-2 · Exam-pack products + paywall attach + bundle — **stub** (depends_on: IAP-1, CONTENT-5)
### WIDGET-1 · ImageMatch + Classification widgets — **stub** (paths: mobile/src/presentation/components/assessments/ — NO TextInput, guardrail-enforced)

> Phase-4 prompts are intentionally unwritten. `/orchestrate` expands them when Phase 3 lands.

---

# Phase 5 — Launch Prep (Legal + Store)

### LEGAL-3 · Account data export (Apple 5.1.1(v)) — **stub**
> Account deletion is done (`delete-account` Edge Function, live). Data export remains. owner: both. paths: mobile/ + supabase/.

### STORE-1 · Store assets — icon, 6 screenshots, description — **stub**
> Use the `/aso` skill. owner: agent (draft) + ryan (final icon sign-off, ships as vector). paths: website/ + store metadata.

### STORE-2 · Verify legal site live (privacy/ToS), support email, lexitap.app — **stub**
### SUBMIT-1 · Apple ($99/yr) + Google ($25) submission — **stub** owner: ryan.

> Expand the Phase-5 block via `/orchestrate` once Phase 4 content + IAP are real.

---

# Phase 6 — Growth (post-launch) — **not yet decomposed**

ASO, Reddit presence, monthly content drops (GRE wk22, GMAT wk26, Idioms wk30, Phrasal Verbs wk34 — see ROADMAP cadence). Decompose after launch.

---

*Maintained by `/orchestrate`. Last sync: 2026-06-10 (seeded). Source of task-level truth for dependencies remains [`plans/RELEASE_PLAN.md`](plans/RELEASE_PLAN.md); this file is the runnable projection of it.*
