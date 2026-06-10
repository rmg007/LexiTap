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

**BETA-1 ✅ cleared 2026-06-10 — build distributed to internal testers on TestFlight.**

**2026-06-10 PM batch ✅ — every agent-doable code task on the frontier is DONE** (commits `da530c7`…`cde165d`, all CI-green): AUTH-1 code half (native SIWA + Google, env-gated), IAP-1 code tail (RevenueCat alias + Restore purchases), CONTENT-2 driver (`enrich-senses` one-command run), STORE-2 site fixes (deployed + verified live). A 30-agent adversarial review confirmed 24 findings — all fixed same-day. **CI was dead since the SDK-56 upgrade (TS2882 on clean checkouts) — fixed via committed `mobile/expo-types.d.ts`.**

**Ryan-only / external-blocked — no agent can advance these (now mostly clicks, not work):**

**2026-06-10 evening ✅ — STORE-2 fully done** (Ryan's DNS + Email Routing clicks landed; lexitap.app live + verified). **AUTH-1 dashboards done** (Supabase Apple/Google providers enabled, Google iOS client ID created, EAS env var set — all verified via API); **EAS build 3 (`728f9d28`) built + submitted to App Store Connect** (awaiting Apple processing). ⚠️ **Incident: the Supabase project had AUTO-PAUSED** (free tier, ~7 idle days since the June-1 deploy) — DNS for `xippwvtmkpskldlmouro.supabase.co` was gone, meaning TestFlight build 2's auth/backup were silently dead for ~2 days. Restored same-day, everything survived. → new task `SUPA-1`.

| id | task | blocked_by |
|---|---|---|
| `CONTENT-2` | pipeline rebuilt on JSONL+OpenAI (`categorize`+`enrich-master`); bulk run HELD | scalable seeding strategy (e.g. Batch API) |
| `AUTH-1` | device verify once build 3 hits TestFlight | Apple processing + Ryan's device |
| `SUPA-1` | upgrade Supabase to Pro (free tier auto-pauses → prod outage) | billing decision |
| `RC-1` | RevenueCat account + product config | RevenueCat account; App Store Connect products |
| `BETA-2` | Recruit 50 beta testers | testers; D7 data takes 7 days |

> Agent-doable `ready` tasks: none until RC-1 unblocks IAP-1's live verify or AUTH-1's device verify unblocks BACKUP-1. Critical path: D7 retention gate (7 days) + RC-1 setup in parallel. **Pre-submission blockers: AUTH-2 (Apple token revocation) + RC-2 (RevenueCat customer deletion) — both in the delete-account Edge Function, both need Ryan-owned secrets — and SUPA-1 (Supabase Pro; free tier is incompatible with a launched app).**

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

### CONTENT-2 · Phase 2 paid enrichment run — **pipeline rebuilt (JSONL + OpenAI); bulk run HELD**
```
id: CONTENT-2   phase: 2   status: ready   owner: ryan
depends_on: [CONTENT-1]   parallel_safe: false   paths: [content-tool/, mobile/assets/vocab/words.db]
blocked_by: a scalable seeding strategy — per-word sync calls don't scale to 2,848 words (see note)
verify: top-N words enriched (senses + 5 questions); validate --strict clean (0 errors); words.db rebuilt + copied to mobile
```
**Pipeline rebuilt around JSONL + OpenAI 2026-06-10** (merge `6cda5f1`, 289 content-tool tests green). The repo has `OPENAI_API_KEY` (no Anthropic key), so enrichment moved OFF the legacy Anthropic `enrich-senses`/`ingest-senses` path (kept inert) onto two OpenAI commands that edit `data/input/words_master.jsonl` in place:
- **`categorize`** (Phase 3) — per word: CEFR + specialty tiers (this also subsumes CONTENT-3's cross-reference).
- **`enrich-master`** (Phase 4) — per word: felt senses + examples + 5 click/drag questions (one per type, hint+explanation), validated (senses V1–V10, questions Q1–Q9), fail-closed.
Both `--limit`-gated, cost-estimated, `--dry-run`, resume-safe. Runbook: [`content-tool/PHASE3_4_RUNBOOK.md`](content-tool/PHASE3_4_RUNBOOK.md).

**Bulk run HELD (Ryan, 2026-06-10):** per-word synchronous calls run ~50 words/min and cost ≈$7–30 for one Phase-4 pass over 2,848 words — the wrong unit of work at scale. Decide a scalable engine first (OpenAI **Batch API** ~50% cheaper + async; or frequency-prioritized waves; or many-words-per-call). The commands are correct + tested + resume-safe — the open question is the seeding *strategy*, not code. A partial `categorize` run (~500 words) was validated then reverted. When ready:
```bash
cd content-tool && set -a && . ../.env && set +a            # OPENAI_API_KEY from repo root .env
npm run cli -- categorize    --limit 3000 --dry-run         # $0 — selection + cost (~$0.28 full)
npm run cli -- enrich-master --limit <n> --model gpt-4.1 --dry-run
# drop --dry-run to run (resume-safe), then:
npm run cli -- import-master --source data/input/words_master.jsonl
npm run cli -- validate --strict                            # expect 0 errors / ~2802 known warnings
npm run release                                             # rebuild words.db + copy to mobile
```
All generated content lands `reviewed: 0` (Ryan flips per word after QA).

### CONTENT-3 · Specialty-tier cross-reference (TOEFL/IELTS/…) — **approach changed: now code, not sourcing**
```
id: CONTENT-3   phase: 2   status: blocked   owner: ryan
depends_on: []   parallel_safe: true   paths: [content-tool/data/input/]
blocked_by: bundled with the CONTENT-2 seeding-strategy decision
verify: specialty tiers (toefl/ielts/gre/gmat/business/advanced/common9k) populated on real words; import + validate green
```
**Superseded 2026-06-10:** the shipped `categorize` command cross-references every word against the specialty tiers *via the model* — no external CSV sourcing or licence-checking needed. CONTENT-3's deliverable (tiers populated) is now produced by running `categorize` (Phase 3), bundled with the CONTENT-2 run decision. The old `*.csv` tier stubs are dead.

### CONTENT-4 · Universal audio (neural TTS)
```
id: CONTENT-4   phase: 3   status: blocked   owner: ryan
depends_on: [CONTENT-2]   parallel_safe: false   paths: [content-tool/]
blocked_by: Polly/Google TTS account (~$10) — NOT ElevenLabs (per decision)
verify: word + sentence audio generated for shipped content; bundled
```
**Stub:** expand after content is firm.

### BETA-1 · TestFlight + Play Internal distribution  ✅ done
```
id: BETA-1   phase: 2   status: done   owner: ryan
depends_on: [BUILD-1, SDK-56]   parallel_safe: false   paths: []
verify: build distributed to internal testers on TestFlight; analytics/Sentry events arriving
commit: build 9bf46ff6 (SDK 56 / RN 0.85 / v0.1.0 build 2); submitted 2026-06-10; testers added
```
Build distributed to internal testers on TestFlight. Analytics/Sentry event verification pending real tester usage. Android on hold (iOS-only path). **Unblocks BETA-2.**

**Hard-won lessons:**
1. `--profile preview` is ad-hoc → ASC rejects it. Use `--profile beta` (`distribution: store`).
2. ASC API key `YLG2BU44NG` had expired → regenerated `PL3GWRNB7B` via `eas credentials`.
3. Apple mandates iOS 26 SDK (error 90725) → drove the SDK-56 upgrade.

### SDK-56 · Expo SDK 52 → 56 upgrade (RN 0.85 / React 19)  ✅ done
```
id: SDK-56   phase: 2   status: done   owner: agent
depends_on: []   parallel_safe: false   paths: [mobile/]
verify: mobile npm run check green; expo-doctor 21/21; EAS beta build compiles under Xcode 26
commit: 556606c
```
Forced by Apple's iOS-26-SDK mandate. expo 56 / RN 0.85 / React 19.2 / reanimated 4 (+worklets) / Sentry 7.11 / jest-expo 56 / RTL 14 / TS 6. Removed the obsolete SDK-52 metro shim + nativewind patch; expo-file-system→`/legacy`; RTL 14 async render + React-19 deferred-state test flushes. 51 suites / 479 tests green; doctor 21/21; **build `9bf46ff6` compiled clean under Xcode 26.**

### BETA-2 · Recruit 50 beta testers
```
id: BETA-2   phase: 2   status: ready   owner: ryan
depends_on: [BETA-1]   parallel_safe: true   paths: []
blocked_by: testers; D7 data takes 7 days from first session
verify: 50 testers enrolled; D7 retention measurable (gate: D7 > 30%)
```
BETA-1 ✅ — TestFlight build is live. Share the TestFlight link. Target: r/TOEFL, r/IELTS, r/languagelearning, ESL Facebook groups, cram-school contacts. See `plans/P2_RECRUITMENT_CHECKLIST.md`. D7 gate: wait 7 days after first tester session before reading retention data.

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

### IAP-1 · Wire RevenueCat into paywall + restore + entitlement gating  ⚠ high-risk path — **code ✅ complete, live verify blocked on RC-1**
```
id: IAP-1   phase: 3   status: blocked   owner: ryan
depends_on: [RC-1]   parallel_safe: false   paths: [mobile/src/infrastructure/iap/, mobile/src/presentation/screens/SettingsScreen.tsx]
blocked_by: RC-1 (account + products + EAS secrets) — then on-device sandbox verify only
verify: purchase → entitlement unlocks pack; Settings "Restore purchases" works; alias visible in RC dashboard after sign-in; npm run check green
commit: 10af213 (+ contract fixes c188bb9)
```
**All code shipped 2026-06-10** (paywall purchase flow + entitlement gating were already done in R4–R6): `IapPort.logIn/logOut` (boolean, never-throw, cache-invalidating), container `syncIapIdentity` (dedup commits only on success; cold-start stale-alias revert), Settings "Restore purchases" row (always visible per 3.1.1; failure ≠ "no purchases" — null contract; screen-reader announced). Legacy duplicate `IapService.ts` deleted. **Remaining = RC-1's dashboard work + EAS secrets (`EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`), then a sandbox purchase/restore/sign-in pass on device.**

### AUTH-1 · Native Google Sign-In + Sign in with Apple (Guideline 4.8) — **code ✅ + dashboards ✅; build 3 in flight**
```
id: AUTH-1   phase: 3   status: in-progress   owner: ryan
depends_on: [BUILD-1]   parallel_safe: false   paths: [mobile/src/infrastructure/auth/, mobile/app.config.ts]
blocked_by: build 3 (728f9d28) SUBMITTED to ASC 2026-06-10 → Apple processing → device verify
verify: both native flows complete on device; session persists; magic-link still works
commit: 590de22 (+ review fixes c188bb9)
```
**All code shipped 2026-06-10:** `AuthPort.signInWithIdToken('apple'|'google')`, `AppleSignInAdapter` (expo-apple-authentication ~56.0.4) + `GoogleSignInAdapter` (@react-native-google-signin ^16.1.2, env-gated on `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`), AuthContext `signInWithApple`/`signInWithGoogle` + availability flags, SignInScreen native buttons (re-entrancy-guarded, cancel = silent), app.config plugins (Google plugin only when env present; `usesAppleSignIn: true`; buildNumber → 3). 520 tests green. **Dashboards done 2026-06-10 evening (verified via API, not asserted):** Supabase auth settings report `apple: true, google: true`; `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` present in EAS production env; `eas config --profile beta` resolves the production environment and emits both auth plugins with the correctly reversed `iosUrlScheme`. **Build 3 (`728f9d28`) built + SUBMITTED to App Store Connect** (submission `52c45e6c`). Remaining: Apple processing (~10 min) → (f) verify both flows + magic link on device ([`mobile/AUTH_INTEGRATION.md`](mobile/AUTH_INTEGRATION.md)). Unblocks BACKUP-1 once device-verified.

### AUTH-2 · Apple token revocation on account deletion (App Review 5.1.1(v))  ⚠ pre-submission blocker
```
id: AUTH-2   phase: 3   status: blocked   owner: both
depends_on: [AUTH-1]   parallel_safe: true   paths: [supabase/functions/delete-account/]
blocked_by: Apple Services key (.p8) must exist + be set as a Supabase function secret
verify: deleting an account whose identities include provider 'apple' revokes the Apple token (appleid.apple.com /auth/revoke); deletion still completes for non-Apple users
```
**Found by adversarial review 2026-06-10:** once SIWA ships, Apple REQUIRES apps to revoke Sign in with Apple tokens when an account is deleted. The `delete-account` Edge Function has no revoke step. Agent half: mint the client-secret JWT from the .p8, call `/auth/token` + `/auth/revoke` for users with an `apple` identity (via `admin.getUserById().identities`), fail-safe ordering (revoke before the irreversible auth-user delete). Ryan half: create the Apple Services key + store as function secret. **Must land before App Store submission.**

### RC-2 · RevenueCat customer deletion in delete-account  ⚠ erasure-claim accuracy
```
id: RC-2   phase: 3   status: blocked   owner: both
depends_on: [RC-1]   parallel_safe: true   paths: [supabase/functions/delete-account/]
blocked_by: RevenueCat secret API key (account doesn't exist yet — RC-1)
verify: delete-account removes the RevenueCat customer (DELETE /v1/subscribers/{app_user_id}) in the storage-clear phase, fail-fatal like the storage step
```
**Found by adversarial review 2026-06-10:** the IAP-1 alias (`Purchases.logIn(supabaseUserId)`) creates account-linked data at RevenueCat that account deletion never touches. Site copy was softened same-day (delete-account.html discloses store/RevenueCat purchase records); this task makes the erasure real once RC-1 provides the secret key.

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

### STORE-2 · Legal site live (privacy/ToS), support email, lexitap.app ✅ done
```
id: STORE-2   phase: 5   status: done   owner: ryan
depends_on: []   parallel_safe: true   paths: [website/public/]
verify: https://lexitap.app/privacy + /terms + /delete-account return 200; support@lexitap.app receives mail — PASSED 2026-06-10
commit: e5f0e3e (+ privacy updates c188bb9)
```
**Closed 2026-06-10 evening.** Agent half: audit found the site was NOT live (memory's 2026-05-31 "deployed" claim was wrong — no DNS, stale deploy, `_redirects` `.html`-alias loop vs Pages pretty-URL 308); fixed + deployed + `/delete-account` page added. Ryan half: CNAME `@` + `www` → `lexitap.pages.dev` (proxied) + Email Routing `support@` → personal inbox (Active). Verified: `https://lexitap.app/privacy` + `/delete-account` load clean on the apex domain.

### SUPA-1 · Supabase Pro plan (free tier auto-pauses → production outage)  ⚠ pre-submission blocker
```
id: SUPA-1   phase: 5   status: ready   owner: ryan
depends_on: []   parallel_safe: true   paths: []
blocked_by: billing decision (~$25/mo)
verify: project xippwvtmkpskldlmouro shows plan = Pro (or pause-prevention equivalent); no pause warnings in dashboard
```
**Incident 2026-06-10:** the project auto-paused after ~7 idle days (free tier) — DNS for `xippwvtmkpskldlmouro.supabase.co` disappeared entirely, so TestFlight build 2's auth, account deletion, and backups were silently dead for ~2 days. Restore preserved everything (bucket, RLS, Edge Function, providers). A launched app cannot sit on a tier that turns the backend off after a quiet week; beta-period traffic may keep it warm, but that's luck, not a guarantee. **Upgrade before App Store submission at the latest.** Also: keep `SUPABASE_ACCESS_TOKEN` in root `.env` (currently missing on this machine) so the MCP/CLI can see project state.

### SUBMIT-1 · Apple ($99/yr) + Google ($25) submission — **stub** owner: ryan.

> Expand the Phase-5 block via `/orchestrate` once Phase 4 content + IAP are real.

---

# Phase 6 — Growth (post-launch) — **not yet decomposed**

ASO, Reddit presence, monthly content drops (GRE wk22, GMAT wk26, Idioms wk30, Phrasal Verbs wk34 — see ROADMAP cadence). Decompose after launch.

---

*Maintained by `/orchestrate`. Last sync: 2026-06-10 evening (STORE-2 done — domain live; AUTH-1 dashboards done + build 3 in flight; +SUPA-1 after the Supabase auto-pause incident). Source of task-level truth for dependencies remains [`plans/RELEASE_PLAN.md`](plans/RELEASE_PLAN.md); this file is the runnable projection of it.*
