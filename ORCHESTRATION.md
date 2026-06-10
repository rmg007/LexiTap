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

**BUILD-1 ✅ cleared 2026-06-10 — app confirmed on physical device. Phase 3+ is now unblocked.**

**Ryan-only / external-blocked — no agent can advance these:**

| id | task | blocked_by |
|---|---|---|
| `CONTENT-2` | Phase 2 paid enrichment run | paid API spend + model choice |
| `BETA-1` | TestFlight + Play Internal distribution | TestFlight build upload + Play Console setup |
| `RC-1` | RevenueCat account + product config | RevenueCat account; App Store Connect + Play Console products |
| `AUTH-1` | Native Google + Sign in with Apple | native modules (needs dev build); Apple requires SIWA when Google offered |

> **Next recommended action (Ryan):** run the full learn-flow smoke on device (learn batch → Quick-check appears → confirm an `srs_state` row is written) — proves SRS + DB end-to-end before committing to Phase 3. Then pick BETA-1 or CONTENT-2.
> No agent-doable `ready` tasks remain until RC-1 unblocks IAP-1 or AUTH-1 is done.

---

# Phase 1 — Build (finish the gate)

### E2E-1 · Maestro learn-loop end-to-end flow ✅ done
```
id: E2E-1   phase: 1   status: done   owner: agent
depends_on: []     parallel_safe: true   paths: [mobile/.maestro/]
verify: `learn-loop.yaml` written + lints; runs green once a sim build exists (BUILD-1)
commit: e6dead3 (merged)
```
`mobile/.maestro/learn-loop.yaml` written. Taps through age-gate → onboarding → learn batch (repeat:10, guarded on "Got it") → asserts Quick-check header → answers one question → asserts Home. Cannot run green until BUILD-1. No production source touched.

### CONTENT-1 · content-tool synthesis + validator remainder ✅ done
```
id: CONTENT-1   phase: 1   status: done   owner: agent
depends_on: []   parallel_safe: true   paths: [content-tool/src/]
verify: content-tool `npm run check` green; validator covers rich-sense rows; synthesis emits the ingest format
commit: cc83fb0 (merged)
```
`synthesize-senses.ts`: `validateSenseIngestItem` (V1–V10 pre-write invariants) + `serializeSenseIngestFile` (canonical JSONL with round-trip guarantee). 34 new tests; 165 total green. CONTENT-2 unblocked.

### LEGAL-2 · 16+ age gate — finish + verify ✅ done
```
id: LEGAL-2   phase: 1   status: done   owner: agent
depends_on: []   parallel_safe: true   paths: [mobile/app/onboarding/, mobile/src/presentation/screens/onboarding/]
verify: age gate blocks <16, persists, has a render test; mobile `npm run check` green
commit: a6ac11b (merged)
```
`OnboardingAgeGateScreen`: added AsyncStorage persistence (`lexitap.age.gate.passed` / `lexitap.age.gate.rejected`), auto-advance on pass, permanent dead-end on reject (no re-prompt). `AgeGateScreen.render.test.tsx` (5 tests: fresh render, auto-advance, permanent rejection, under-16 persists, ≥16 persists). 474 tests green.

### STORE-3 · expo-doctor + SDK-upgrade evaluation ✅ done
```
id: STORE-3   phase: 1   status: done   owner: agent
depends_on: []   parallel_safe: true   paths: []
verify: a memory note enumerating expo-doctor findings + a keep/upgrade recommendation with reasons
```
16/18 checks pass. Two findings: (1) metro@0.84.4 — KNOWN-BENIGN per project memory, nativewind side-effect, cannot fix without SDK bump; (2) `.expo/` tracked in git — FIXED inline (`git rm --cached mobile/.expo/types/router.d.ts`, added `.expo/` to `mobile/.gitignore`). **No SDK bump warranted before launch.** See memory note 2026-06-10.

### RTL-1 · Test-utils extraction + renderWithProviders ✅ done
```
id: RTL-1   phase: 1   status: done   owner: agent
paths: [mobile/src/test-utils/]
commit: 4c14527 (merged)
```
`mobile/src/test-utils/learnFixtures.ts` + `renderWithProviders.tsx`. Shared BATCH fixture extracted from both learn test files; inline ThemeProvider+ServicesProvider replaced with `renderWithProviders`. 479 tests green.

### BUILD-1 · EAS build → C0 on-device smoke  ✅ done
```
id: BUILD-1   phase: 1   status: done   owner: ryan
depends_on: []   parallel_safe: false   paths: [mobile/]
verify: app cold-launches on a real device; learn flow → quick-check appears → an srs_state row is written
commit: EAS preview build succeeded 2026-06-10 (fixes: b8d85de + 5f373f5); app confirmed on physical device
```
Cold-launch confirmed on device. **Recommend:** run full learn-flow → Quick-check → srs_state row write before kicking off Phase 3 tasks (proves SRS + SQLite end-to-end on real hardware). **Unblocks: BETA-1, RC-1, AUTH-1.**

---

# Phase 2 — Content (the long pole) + Beta

### CONTENT-2 · Phase 2 paid enrichment run
```
id: CONTENT-2   phase: 2   status: ready   owner: ryan
depends_on: [CONTENT-1]   parallel_safe: false   paths: [content-tool/, mobile/assets/vocab/words.db]
blocked_by: paid API spend + top-tier model choice
verify: top-N words enriched with rich senses; validate --strict clean; words.db rebuilt + copied to mobile
```
**Stub:** CONTENT-1 ✅ (synthesis + pre-write validation now exist). Real "seedings" — top-N by frequency, top-tier model (cheap bulk = slop on "feel it", per Ryan). Expand to a full prompt via `/orchestrate expand CONTENT-2` once run parameters (N, model, budget) are chosen.

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
id: BETA-1   phase: 2   status: ready   owner: ryan
depends_on: [BUILD-1]   parallel_safe: false   paths: []
blocked_by: TestFlight build upload (eas submit) + Play Console internal track setup
verify: build distributed to internal testers on both tracks; analytics/Sentry events arriving
```
BUILD-1 ✅ — this is now Ryan's next distribution step. See `plans/P2_BETA_PLAN.md`. Run `eas submit --platform ios --profile preview` to push the preview build to TestFlight. Android on hold (iOS-only path for now). Sentry auth token must be set as EAS secret before a production/beta build with source maps: `eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <token>`.

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
id: RC-1   phase: 3   status: ready   owner: ryan
depends_on: [BUILD-1]   parallel_safe: true   paths: [mobile/eas.json]
blocked_by: RevenueCat account; App Store Connect + Play Console products
verify: exam_* + all_exams products + entitlements configured; keys in EAS secrets
```
BUILD-1 ✅ — unblocked. Still needs external accounts. See `plans/P3_REVENUECAT_PLAN.md`. Unblocks IAP-1 once done.

### IAP-1 · Wire RevenueCat into paywall + restore + entitlement gating  ⚠ high-risk path
```
id: IAP-1   phase: 3   status: blocked   owner: agent
depends_on: [RC-1]   parallel_safe: false   paths: [mobile/src/infrastructure/iap/, mobile/src/presentation/screens/PaywallScreen.tsx]
verify: purchase → entitlement unlocks pack; restore works; StubIap still default when unconfigured; npm run check green
```
**Stub:** `RevenueCatIapService.ts` exists; app runs `StubIapService`. `infrastructure/iap/` is a **confirmation-gated high-risk path** — expand with care once `RC-1` provides real products.

### AUTH-1 · Native Google Sign-In + Sign in with Apple (Guideline 4.8)
```
id: AUTH-1   phase: 3   status: ready   owner: both
depends_on: [BUILD-1]   parallel_safe: false   paths: [mobile/src/infrastructure/auth/, mobile/app.config.ts]
blocked_by: native modules require a dev/prod build; Apple requires SIWA whenever Google offered
verify: both native flows complete; session persists; magic-link still works
```
BUILD-1 ✅ — unblocked. AU2/AU3 deferred to pre-submission per Ryan's decision (2026-06-01). See `plans/P3_AUTH_PLAN.md`. Unblocks BACKUP-1 once done.

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

### LEGAL-3 · Account data export (Apple 5.1.1(v)) ✅ done
```
id: LEGAL-3   phase: 5   status: done   owner: agent
paths: [mobile/src/domain/export/, mobile/src/presentation/screens/SettingsScreen.tsx]
commit: 6fdfc07 (merged)
```
`UserDataExportUseCase` + 5 tests. Settings "Export my data" → native Share Sheet (JSON). 479 tests green.

### STORE-1 · Store assets — copy, keywords, screenshots spec ✅ done (draft)
```
id: STORE-1   phase: 5   status: done   owner: agent
paths: [plans/STORE_ASSETS_PLAN.md]
commit: 7b7b885 (merged)
```
`plans/STORE_ASSETS_PLAN.md` — full App Store copy, iOS subtitle, Android short desc, keywords (94 chars), 6-screen screenshot spec, 15s App Preview storyboard. Ryan reviews + signs off final icon (ships as vector).

### STORE-2 · Verify legal site live (privacy/ToS), support email, lexitap.app — **stub**
### SUBMIT-1 · Apple ($99/yr) + Google ($25) submission — **stub** owner: ryan.

> Expand the Phase-5 block via `/orchestrate` once Phase 4 content + IAP are real.

---

# Phase 6 — Growth (post-launch) — **not yet decomposed**

ASO, Reddit presence, monthly content drops (GRE wk22, GMAT wk26, Idioms wk30, Phrasal Verbs wk34 — see ROADMAP cadence). Decompose after launch.

---

*Maintained by `/orchestrate`. Last sync: 2026-06-10 (seeded). Source of task-level truth for dependencies remains [`plans/RELEASE_PLAN.md`](plans/RELEASE_PLAN.md); this file is the runnable projection of it.*
