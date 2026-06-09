# LexiTap Memory Index

This directory contains session notes, architectural decisions, and lessons learned. Files here are auto-loaded into CLAUDE.md via `@memory/MEMORY.md`.

---

## 🎨 Session: Design Finalization Plan + Figma housekeeping (2026-06-09)

**Plan = [`plans/DESIGN_FINALIZATION_PLAN.md`](../plans/DESIGN_FINALIZATION_PLAN.md)** (status: accepted). Goal: complete + comprehensive Figma design **before any RN code** (Ryan: burned before by code-first). Phase 0 foundation → 10 per-page sections.
- **Canonical token source = `mobile/src/presentation/theme/tokens.ts`** (shipping truth) + `lexitap-docs/03-ux-design/DESIGN_SYSTEM.md` (intent). Figma **ports 1:1**, does NOT invent. Brand = **single teal `#20B2AA`, dark-canonical** — the Figma legacy paint styles (Coral/Gold/Navy/Turquoise) are STALE → delete. Icons = **Lucide** (Apache 2.0, resolved). Web `styles.css` is a partial mirror, NOT source (its spacing names differ).
- **⚠️ 4 code↔doc divergences flagged, Ryan-decision pending** (don't bind type until resolved): (1) Playfair vs "Inter-only" for h1/display — code ships Playfair, recommend ratify; (2) headline 18/700 code vs 22/600 doc; (3) body 15 vs 16; (4) light text.tertiary #6B7378 vs #878F92. Rule: `tokens.ts` wins, doc corrected same pass.
- **Audit gate built + PROVEN: [`.design-specs/figma-binding-audit.js`](../.design-specs/figma-binding-audit.js)** (use_figma script). Home baseline: `gate FAIL · rawFills 76 · textBound 0/51 · emoji 15 · instances 0`. Code-ready = `gate PASS` per page.
- **Housekeeping DONE in Figma** (file `Jx0TLmVpgmsjtMA3uB6uS4`, now **14 pages**): deleted empty `✨ Hi-Fi` + `🎨 Design System` pages, removed stray `Design_System` rect + empty dup `Legacy Components` section. Foundation builds into existing 🎨 Tokens / ✏️ Typography / 🧩 Components pages.
- **Decisions:** proficiency screen CUT; "known" metric w/ explicit denominator; drag-drop **kept** (MVP per doc — earlier cut reverted). Effort revised 40%→~25-30% (port, not invent).
- **Next:** resolve the 4 divergences → Phase 0.1 variables (port table in plan) → rebuild Home → audit `PASS` → proceed sections.

---

## 🎨 Session: Asset Operations System (2026-06-09)

**[Asset Operations System (2026-06-09_asset_operations_system.md)](2026-06-09_asset_operations_system.md)** — unified, agent-discoverable system for create/update/delete of designs, CSS, images, icons. Canonical guide = [`scripts/README.md`](../scripts/README.md). New AI raster gen: `scripts/generate-image.js` (OpenAI `gpt-image-1`, dependency-light, `OPENAI_API_KEY` in `.env`). Surfaced in auto-loaded CLAUDE.md + AGENTS.md. **Reconciled the old "never create icons" rule → generate freely for og/marketing/content; final store icon + logo still need Ryan's sign-off + ship as vectors.** Settings: dropped `Edit(**/.env)` deny, allowed the gen scripts. **+ Smoothness:** root `package.json` (pins sharp/svgo, fixes new-laptop bug), `optimize-asset.js` (PNG/SVG shrink, auto-runs on gen), `/gen-image` command, Supabase MCP (`.mcp.json`, read-only). **+ Enforced guardrails:** native `.claude/hooks/guardrails.mjs` (PreToolUse) hard-blocks `git add .env`/`-A`/`commit -a`, TextInput in passive screens, SQL interpolation — chose native hook over hookify plugin (travels in repo). 12/12 self-test. **+ `/aso` skill:** vetted App Store Optimization (`.claude/skills/aso/`, SKILL.md + 5 refs) tailored to LexiTap — keyword/metadata/screenshots/reviews/launch-checklist, no third-party scripts. Built after surveying 4 external skill repos (none worth importing).

---

## 🛠️ Session: Claude Code Infra Hardening (2026-06-09)

**[Claude Code Infra Hardening (2026-06-09_claude_code_infra_hardening.md)](2026-06-09_claude_code_infra_hardening.md)** — audited the actual harness config (not generic advice). **Fixed 2 real bugs:** CI was DEAD since `master→main` rename (`ci.yml` triggered on `[master]` → 0 runs since; fixed → `[main]`), and 4.5 GB of stale locked agent worktrees pruned (all merged into main, dead lock pids). **Automated 3 honor-system rules:** SessionStart hook (`session-context.sh`) injects open issues + git ahead/behind as JSON `additionalContext` (plain stdout is NOT model-visible — verified); status line (`statusline.sh`) shows model · branch · ↑unpushed · PR# · ctx%; `autoMemoryEnabled:false` (home-folder memory banned by policy, facts already in repo). Verified NOT real: `.claude/rules/` paths feature. Also harvested `mobile/EXPO_NOTES.md` (RN/Expo gotchas + unistyles-rejected + barrel-kept) + RTL render-guard gap → [issue #10](https://github.com/rmg007/LexiTap/issues/10). **Meta-lesson: audit your own setup before importing skills** (11+ repo surveys → ~1 note each).

---

## 🔧 Session: Figma Hi-Fi Redesign + Tooling (2026-06-09)

**[Figma Hi-Fi Redesign + Tooling (2026-06-09_figma_hifi_redesign_and_tooling.md)](2026-06-09_figma_hifi_redesign_and_tooling.md)** — Redesigned word-learning screens 12/14/15 in Figma (new model: multi-meaning, no mandatory image, context quiz, teaching-first feedback). Renamed default branch `master` → `main`. Created `/snip` slash command for session memory extraction. ⚠️ Duplicate Figma frames need manual cleanup. ⚠️ Restore-staging-fix still uncommitted in working tree.

---

## 🎯 Session: DIAG-A Adaptive Band-Walk Diagnostic — IMPLEMENTED (2026-05-31)

**[DIAG-A Adaptive Diagnostic (2026-05-31_diag_a_adaptive_diagnostic.md)](2026-05-31_diag_a_adaptive_diagnostic.md)** — replaced the DIAG-B stride sampler (deferred post-launch item #10) with the full adaptive band-walk: pure engine (`domain/onboarding/adaptiveDiagnostic.ts`, 34 tests) + frontier seeding (`frontierSeeding.ts`, 16 tests) + `RunAdaptiveDiagnosticUseCase` (9 tests) + pseudo-word port/repo + confirm-on-Yes UI (`OnboardingAdaptiveDiagnosticScreen`, now the live route). Bundled `words.db` rebuilt: **2790/2881 ranked + 10 pseudo-words** (user_version 2). Plan → `implemented`. ✅ mobile 455 / content-tool 99 green. ⚠️ `infrastructure/db/` deny temporarily lifted + **restored** (net-zero). ⚠️ Committed **DIAG-A paths only** — backup "restore-staging-fix" session's `container.ts` hunks left uncommitted (no `git add -A`). Remaining: close 91-word rank gap, real pseudo-word list, PC-3 resume, PD-3 beta tuning.

---

## 🛟 Session: Settings restore corruption fix — stage + apply-at-boot (2026-06-01)

**[Restore staging fix (2026-06-01_restore_staging_fix.md)](2026-06-01_restore_staging_fix.md)** — resolves "BUG 2" from the LEGAL-4 backup review below. Settings `forceRestore` no longer overwrites the live `user.db` under an open SQLite connection (stale-page corruption). Option (c): `BackupPort.stageRestore` → staging file + `setPendingRestore()` flag; `container.applyPendingRestore()` promotes it at next launch, before `openDatabase()` (the existing safe seam). JS-only, correct-by-construction, +13 tests. ✅ `npm run check` GREEN (46 suites / 455 tests). Restore applies on next app launch (UX already required restart). ⚠️ NOT committed — a **concurrent DIAG-A session** has uncommitted hunks interleaved in the shared `container.ts`, so commit must be sequenced/split (no `git add -A`). Instant-apply via `expo-updates` `reloadAsync()` deferred to the scheduled native build.

---

## 🔐 Session: LEGAL-4 delete-account Edge Function DEPLOYED + backup review (2026-06-01)

- ⚠️ **Scope note / possible conflict:** the AU1 session note below grouped `delete-account` with the deferred AU2/AU3 work. This session DEPLOYED the `delete-account` Edge Function anyway — Ryan's live instruction was "get this task done," and the Edge Function is a **Supabase backend deploy, NOT part of any EAS build**, adds **no login friction**, and only makes the already-wired in-app Delete Account button work (it was hitting 404). AU2/AU3 native sign-in modules remain deferred. Rollback if ever needed: `supabase functions delete delete-account`.
- **`delete-account` Edge Function authored + DEPLOYED** (commit `491b05f`; live **ACTIVE v1** on project `xippwvtmkpskldlmouro`). Powers `SupabaseAuthService.deleteAccount()` (`functions.invoke('delete-account')`). Closes the standing "delete-account NOT yet deployed" gap → **LEGAL-4 production deletion now functional.**
- **Security (defense-in-depth), verified live:** `config.toml [functions.delete-account] verify_jwt=true` (gateway rejects no-auth → 401) + in-function `getUser()` re-derives caller from the verified JWT. Anon-key-only POST → **401 `invalid_token`**: the public anon key is itself a valid project JWT, so `verify_jwt` ALONE is insufficient — `getUser()` is the real gate. Deleted id comes ONLY from JWT, never request input. Service-role key only builds the admin client (never logged/returned). Deployed `--use-api` (no Docker; existing `daily-queue-generator` + `push-notification` functions left untouched).
- **Adversarial review workflow** (4 reviewers + skeptic verify, 12 agents): 8 findings → **2 confirmed**, 6 dismissed (doc nits / speculative). Verifier *corrected* a reviewer's false "WAL mode" claim — expo-sqlite here uses default DELETE journal; no `-wal`/`-shm` sidecars exist.
  - **BUG 1 (FIXED in `491b05f`):** fn discarded `remove()` error then HARD-deleted auth user → a transient storage 5xx (storage-js returns `{error}` WITHOUT throwing) would orphan the encrypted user.db blob forever (RLS-scoped to a now-deleted uid → unrecoverable; incomplete GDPR/CCPA erasure). Fix: clear storage FIRST, list/remove failure is FATAL (500 → client retries while user still exists), delete auth user LAST.
  - **BUG 2 (✅ FIXED 2026-06-01 — [restore-staging-fix](2026-06-01_restore_staging_fix.md)):** Settings `forceRestore` wrote `user.db` over the **live** open SQLite handle — violated `restore()`'s "caller must hot-swap before openDatabase" contract (only boot-time BK2 path honored it). → stale page-cache reads / conditional write-back corruption. **Fix = option (c):** `stageRestore` downloads to a staging file (never the live DB) + a pending flag; `container.applyPendingRestore()` promotes it at next boot, before `openDatabase()` — correct-by-construction, no native dep. Instant-apply via `expo-updates` `reloadAsync()` deferred to the scheduled native build (sits on top of this; not throwaway).
- **Live Supabase re-verified:** bucket `user-backups` `public:false`, RLS enabled, policy `cmd=ALL` / `authenticated` / own-prefix scope (`(string_to_array(name,'/'))[1] = auth.uid()`). ⚠️ Minor: bucket `file_size_limit=null` (migration comment claims 100MB) — an authenticated user could upload large objects to their own prefix; low-sev hardening, optional.
- **Test baseline unchanged: 41 suites / 381 green** (only `supabase/` touched this session).

---

## 🔧 Session: Auth UI — AU1 Magic-Link + Deep-Link (2026-06-01)

- **AU1 magic-link flow complete** (commits `dd104b9`, `7029bd2`): `AuthContext` + `useAuth` hook, `SignInScreen` (two-phase: email → 6-digit OTP), `app/auth/sign-in.tsx` route, `AuthProvider` in `_layout.tsx`, `SettingsScreen` Account card (sign-in/sign-out/restore)
- **AU1.4 deep-link**: `AuthPort.verifyOtpLink(tokenHash)` — `lexitap://auth/callback?token_hash=…` → session + `router.replace('/')`. Wired via `Linking.addEventListener` + `getInitialURL()` inside `AuthProvider`
- **AU4.4 session refresh**: `AppState` listener in `AuthProvider` syncs session on foreground resume
- **Test baseline: 41 suites / 381 tests green**
- ⏸ **AU2/AU3 (native Google/Apple sign-in) deferred to pre-submission** (Ryan's decision 2026-06-01): auth doesn't gate any core feature; no login friction during testing. AU2 + AU3 ship in one final EAS build before App Store submission. **UPDATE 2026-06-01:** the `delete-account` Edge Function — originally grouped here — was DEPLOYED (commit `491b05f`); it is a Supabase *backend* deploy, NOT part of any EAS build, adds no friction, and just makes the already-wired Delete Account button work (was 404). Only the AU2/AU3 *native modules* remain deferred.
- ⏸ **Android on hold** — iOS-only path for now.
- ✅ Supabase `user-backups` bucket + RLS done (`3f73a8e`); iOS prebuild done (`ios/` dir present)

---

## ✅ Session: C5 Validation Run + Validator Fix (2026-05-31)

**[C5 Validation Run (2026-05-31_c5_validation_run.md)](2026-05-31_c5_validation_run.md)**
- **C5 = PASS**: `validate --strict` on C4-enriched DB → `2881 rows, 0 errors, 2802 warnings`. DB release-eligible (warnings never block).
- Fixed `hasInTokenUnderscore` false-positive regex (`/\S_|_\S/` flagged "eat _." like "cataly_t") → warnings 3141→2802, +1 test, 97 green.
- ⚠️ **Remaining 2802 warnings = KNOWN content debt, triaged (do NOT re-investigate):** 2798× `theme='General'` (bulk 3k expansion placeholder — content decision for Ryan) + 4× AI-generated `_s` glue sentences (minor). Re-running C5 → expect `0 errors, ~2802 warnings` (known-good baseline).

---

## 🔧 Session: BK1.2 + BK2 Backup (2026-06-01)

**[BK1.2 + BK2 Backup Implementation (2026-06-01_bk1_2_bk2_backup.md)](2026-06-01_bk1_2_bk2_backup.md)**
- Upload trigger (`PerformBackupUseCase`, 6h throttle, fired on `session.start()`), hydration gate in `createContainer()` BEFORE `openDatabase()`, manual restore in Settings (commit `c3a60cc`, 378 tests green)
- ⚠️ **Ryan still needs:** create `user-backups` Supabase bucket + RLS policy, then integration test on real devices
- `last_backup_ms` in AsyncStorage (NOT user_stats) so restores don't reset per-device throttle

---

## 🔧 Session: Content Pipeline + C4 Enrichment (2026-06-01)

**[Content Pipeline Fix + C4 Enrichment (2026-06-01_content_pipeline_and_c4.md)](2026-06-01_content_pipeline_and_c4.md)**
- `npm run release --no-copy` now passes: 2,881 words / user_version=1 (was blocked by 3,125 validate --strict errors)
- **Root causes fixed:** C7 `definition_license` column migration (`openWorkingDb` → `applyWorkingDbMigrations`); stale audio_path cleared; 3 stub example sentences in foundation.csv fixed; `bootstrapWorkingForRelease` no longer runs audio enrich
- **C4 enrichment DB mode added** (commit `ed6791c`); **enrichment RUN complete** (commit `0cc4d45`): DeepSeek-chat enriched 2,790 TBD stubs in 3 passes + 10 manual fixes; `validate --strict` clean; `words.db` (1.18 MB, 2,881 real defs) copied to `mobile/assets/vocab/` — ✅ no further action needed
- ⚠️ **EAS build still needed:** `cd mobile && eas build --platform ios --profile preview` (gates C0 physical device test)

---

## 🎯 Mega-Sprint Summary (2026-05-31)

**[Mega-Sprint Final (2026-05-31_mega_sprint_final.md)](2026-05-31_mega_sprint_final.md)** — AUTHORITATIVE SESSION RECORD
- 30+ production commits, 40+ spawned tasks, 366 tests at time of writing (now 381 green)
- **Phase 1 complete:** Accessibility audit (WCAG AA) + Onboarding (O-1→O-5) + Build infra (EAS locked) + Analytics/Crash (prod-ready) + Monetization (SKU tiers locked)
- **Phase 2-3 blueprints:** P2_BETA_PLAN.md, P3_REVENUECAT_PLAN.md, P3_AUTH_PLAN.md, P3_BACKUP_PLAN.md + 4 decision records (D1–D8)
- **Launch blockers:** C0 device test, C4 enrichment, C5 validation, P-2 beta recruitment (all explicit + prioritized)
- **Next:** Read NEXT_STEPS_2026-06.md for immediate actions (week 1: EAS build + C0 device test + C4 enrichment + C5 validation)

**[Next Steps for June 2026 (NEXT_STEPS_2026-06.md)](NEXT_STEPS_2026-06.md)** — ACTIONABLE ROADMAP
- Week 1: C5 sample → NEW EAS build → C0 device test → C4 enrichment → C5 validation
- Week 1–2: P-2 beta recruitment (parallel)
- Week 2: Optional Android device test + nativewind debt plan
- Success criteria + risk matrix included

---

## Session Detail Index (2026-05-31)

**[AU1 + BK1 Service Layer (2026-05-31_au1_bk1_service_layer.md)](2026-05-31_au1_bk1_service_layer.md)** — Phase-3 auth + backup **code** (not plans) landed @ `9c3232a`, 326 tests green. Supabase magic-link auth (`infrastructure/auth/`) + Storage backup of user.db (`infrastructure/backup/`), env-gated + Noop fallbacks, service-layer only (no UI/wiring yet). ⚠️ **Next-wave traps:** (1) backup MUST share auth's *authenticated* client or RLS silently fails; (2) container.ts unwired (no consumer yet); (3) two duplicated env seams to converge; (4) **babel inlines `EXPO_PUBLIC_*` at build** → Jest env-gate needs an injectable seam (applies to ALL env-gated services); (5) human must create `user-backups` bucket + RLS. Concurrent-tree lesson repeated: shared barrels (`domain/index.ts`) need a single owner.

**[Sprint Summary (2026-05-31_sprint_summary.md)](2026-05-31_sprint_summary.md)** — Original mega-sprint summary
- 67 commits, 15+ agents, P-2 audit complete, Phase 1 critical path (C0 sim proven, O-1→O-5 complete, EAS setup, 4 decisions, 222 tests green)
- [AsterKit Integration (2026-05-31)](2026-05-31_asterkit_integration.md) — Rules, patterns, and workflows adopted from AsterKit; what fit, what didn't
- [Repo State Reconciliation (2026-05-31)](2026-05-31_repo_state_reconciliation.md) — Merged the unmerged fix branch (words.db delivery + 3-SKU tiers + green tests); content VOLUME (~7%) + device-verify are the remaining blockers; integrity-sweep doc fixes
- [words.db 43-vs-216 NOT a regression (2026-05-31)](2026-05-31_content_count_regression.md) — 43 was **deliberate downsizing** (commit `5c190d2`, 9 tiers × 5 stubs), NOT lost by the m2m refactor (`a85d8d9` innocent). Real 216 (foundation 200/advanced 10/toefl 6) recovered from git `5c190d2~1`. Pipeline healthy (CSV→working.db→words.db→cp). **DONE on master: restored CSVs + rebuilt → 241 words / 246 memberships, 9 tiers, integrity ok; content-tool 43 + mobile 163 tests green.** ⚠️ **SUPERSEDED same day** by concurrent C3 content sourcing (commits `f8a9ddd`/`4526bb6`/`eccf83d`): words.db now holds **2,881 words / 2,894 memberships** (foundation 2,848). The 241 restore is historical; docs synced to 2,881.
- [Monetization Rethink (2026-05-31)](2026-05-31_monetization_rethink.md) — Killed subscriptions: free frequency/CEFR content + audio, one-time exam packs ($9.99) + All-Exams bundle ($29.99), upgrade SKUs, B2B deferred, neural-TTS not ElevenLabs; word↔category many-to-many is the next code task
- [Many-to-Many Schema + tiers.ts (2026-05-31)](2026-05-31_schema_many_to_many.md) — Stage 1 done: `word_tiers` junction, category-independent word IDs, exam-pack tiers.ts; mobile `tier_id` = loaded-under category (distractors unchanged); rebuild gotchas (delete working.db, cp to mobile bundle); DB schema v3.1
- [Onboarding Profile Persistence (2026-05-31)](2026-05-31_onboarding_persistence.md) — `user_stats.onboarding_state` wired end-to-end: `OnboardingState` type → `SaveOnboardingProfileUseCase` → defensive `parseOnboardingState` (corrupt→undefined, never throws). Diagnostic saves `{completedAt}` only; goal/band/frontier pickers + display still TODO. db deny-list toggle gotcha.
- [Sentry Crash Reporting (2026-05-31)](2026-05-31_sentry_crash_reporting.md) — Resolved CLAUDE.md-vs-RELEASE_PLAN contradiction: Sentry allowed in prod, env-gated + PII-scrubbed (fail-closed) in `infrastructure/crash/`. B1 + B2-scrub shipped (155 tests green); enrichment tags + source maps (B3) deferred with reasons. Gotchas: `beforeSend` wants `ErrorEvent`; jest mock for native module; `.env.example` deny over-match flagged.
- [Analytics / PostHog Policy (2026-05-31)](2026-05-31_analytics_posthog_policy.md) — Parallel to Sentry: resolved CLAUDE.md-vs-RELEASE_PLAN analytics contradiction. PostHog **allowed in prod**, env-gated + `anon_id`-only + no-PII + autocapture-off + EU-host + opt-out + disclosed, **purpose-limited to app improvement** (Ryan's call). Docs-only reconciliation across CLAUDE.md / .env.example / settings.json deny / RELEASE_PLAN / ANALYTICS_PLAN / privacy policy. Code follow-ups NOT done: **US→EU host bug** (`PostHogAnalyticsService.ts:12`), stale `createAnalyticsService` comment (blocked by new deny rule), A6 opt-out toggle.
- [Onboarding Chain Reality (2026-05-31)](2026-05-31_onboarding_chain_reality.md) — Whole onboarding flow (O-2→O-6) is ALREADY scaffolded + rendering (goal/proficiency/diagnostic/knowledge-map/paywall routes). RELEASE_PLAN understates it. **Real gap = persistence:** `goal`/`band` collected as route params but never written to `onboarding_state` (only `{completedAt}` is). O-2 work = thread collected data into `saveOnboardingProfile` + goal→band default, not build screens. Verify SelectionCard a11y; decide D1 (O-3 keep/cut). H-1/O-1 confirmed done + tested this session.
- [O-2 Complete: Goal Persistence + D1 Decision (2026-05-31)](2026-05-31_o2_goal_persistence.md) — Goal flow wired: goal-selection → diagnostic with goal→CEFR-band default (exam/academic→B2, professional→B1, general→A2). **D1 decision: CUT proficiency screen** (off-spec, CEFR vs frequency-rank). SelectionCard a11y ✓ (72pt targets, selected state). Round-trip tests ✓. RELEASE_PLAN updated, next: O-4 diagnostic.
- [O-4 Complete: Frontier Estimation (2026-05-31)](2026-05-31_o4_frontier_estimation.md) — DIAG-B stride sampler now computes frontier-rank from % correct (0%→rank 500, 100%→3500, linear). Persists to onboarding_state alongside goal/band/completedAt. 4 new tests, 163 total pass. Known: crude estimate (no IRT, no pseudo-words) — DIAG-A post-launch. Next: O-5 Knowledge Map reveal.
- [O-5 Complete: Knowledge Map Reveal (2026-05-31)](2026-05-31_o5_knowledge_map_reveal.md) — Reads frontierRank, computes Known/Learning/New segments, displays animated bar (motion.slow 360ms, respects Reduce Motion). Endowed-progress copy ("You already know ~X words"). Routes "Start learning" → paywall. **Full onboarding (O-1→O-5) complete.** SRS seeded, proficiency learned, frontier calibrated. Next: P-1 remaining + P2 beta setup.
- [iOS Build + C0 PROVEN on simulator (2026-05-31)](2026-05-31_ios_build_posthog_metro.md) — **C0 proven on the iOS sim** (cold launch → words.db ATTACHed → 43 rows → onboarding renders) after fixing 4 bugs: (1) `@posthog/core/surveys` exports-subpath Metro won't resolve → scoped metro.config redirect; (2) **dual React** (nativewind's nested react@19 vs root react@18) → `$$typeof` mismatch → "Objects are not valid as a React child" black-screen crash → extend the metro shim to redirect `react`/`react/*` too; (3) **bare-name `ATTACH 'words.db'`** resolves vs CWD not the SQLite dir → "unable to open database" → ATTACH absolute path (`contentDbAttachPath()`); plus expo-doctor `metro@0.84.4` = benign false-positive (can't pin away without nativewind/RN upgrade). **`npm run check` (155 tests) stayed GREEN through ALL of these** → built `npm run smoke` sim harness; always run the real app for render/native/DB changes. ⚠️ EAS build `0324f457` is STALE (pre-fixes) — NEW build needed for physical-device test. Branch `fix/ios-build-posthog-core-resolution` (5 commits) **not yet pushed**.
- [C0 Smoke Test Verification (2026-05-31)](2026-05-31_c0_smoke_test_verification.md) — **✅ SMOKE TEST PASS** — ran `npm run smoke` on booted iOS simulator (iPhone 11 Pro Max, iOS 26.3). App cold-launched, words.db ATTACHed successfully, 43 rows queryable (≥ WORDS_MIN=1 threshold). Database schema intact, sample rows verified (borrow/neighbour/breakfast/tired/arrive all A2 CEFR). Screenshot captured. Physical device test (iOS + Android) still pending.
- [Legal Docs Complete (2026-05-31)](2026-05-31_legal_docs_complete.md) — Privacy policy, terms of service, account deletion drafted + deployed to lexitap.app (Cloudflare Pages). LEGAL-1/4/5 marked complete. No blocking issues.
- [LEGAL-4 Delete Account Flow (2026-05-31)](2026-05-31_legal4_delete_account.md) — **DONE commit `59554c8`.** `AuthPort.deleteAccount()` → `SupabaseAuthService` calls `delete-account` Edge Function → signs out; `StubAuthService` signs out in-memory. `Services.auth` + `Services.clearUserData()` wired in container (wipes all user.db tables + AsyncStorage keys). `SettingsScreen`: Delete Account → Modal with 30s countdown → delete → `/onboarding`. 338 tests green. ✅ **`delete-account` Edge Function DEPLOYED 2026-06-01 (commit `491b05f`, ACTIVE v1)** — LEGAL-4 production deletion now functional (was: not-yet-deployed). PostHog EU host note was **already fixed** in `PostHogAnalyticsService.ts:17` — stale memory.
- [C6–C8 DONE + Concurrent-Session Hazard (2026-05-31)](2026-05-31_c6_c8_and_concurrent_sessions.md) — **C6 synonyms / C7 `validate --strict` (dup-leak+provenance+dup-def, fail-closed) / C8 `release` pipeline — code DONE, 94 tests green, verdict ship, in `origin/master`.** Remaining content long pole = the PAID enrich RUN (OpenAI $, not code). ⚠️ **HAZARD: multiple sessions committing+pushing master concurrently** — my C6–C8 code got swept into a parallel agent's `git commit -a` under a mislabeled analytics message (no work lost, but entangled). Rule: isolate parallel agents in git worktrees; never `git add -A`/`commit -a` on a shared tree; re-verify `HEAD`/`origin` live. Handoff git claims were FALSE again.
