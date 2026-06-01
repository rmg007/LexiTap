# LexiTap Memory Index

This directory contains session notes, architectural decisions, and lessons learned. Files here are auto-loaded into CLAUDE.md via `@memory/MEMORY.md`.

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
- **C4 enrichment DB mode added** (commit `ed6791c`): `enrich --tier foundation --add-definitions --provider anthropic` → Claude API → `definition_license='ai-original'`; 96 content-tool + 338 mobile tests green
- ⚠️ **Action needed (Ryan):** Run C4 with `ANTHROPIC_API_KEY=sk-ant-...` then `npm run release` (see note for exact commands). Do NOT copy words.db to mobile until after C4 — current bundle has TBD stubs.
- ⚠️ **EAS build ready:** `cd mobile && eas build --platform ios --profile preview`

---

## 🎯 Mega-Sprint Summary (2026-05-31)

**[Mega-Sprint Final (2026-05-31_mega_sprint_final.md)](2026-05-31_mega_sprint_final.md)** — AUTHORITATIVE SESSION RECORD
- 30+ production commits, 40+ spawned tasks, 366 total tests (all green)
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
- [LEGAL-4 Delete Account Flow (2026-05-31)](2026-05-31_legal4_delete_account.md) — **DONE commit `59554c8`.** `AuthPort.deleteAccount()` → `SupabaseAuthService` calls `delete-account` Edge Function → signs out; `StubAuthService` signs out in-memory. `Services.auth` + `Services.clearUserData()` wired in container (wipes all user.db tables + AsyncStorage keys). `SettingsScreen`: Delete Account → Modal with 30s countdown → delete → `/onboarding`. 338 tests green. ⚠️ **Supabase `delete-account` Edge Function NOT yet deployed** — production deletion still needs backend infra. PostHog EU host note was **already fixed** in `PostHogAnalyticsService.ts:17` — stale memory.
- [C6–C8 DONE + Concurrent-Session Hazard (2026-05-31)](2026-05-31_c6_c8_and_concurrent_sessions.md) — **C6 synonyms / C7 `validate --strict` (dup-leak+provenance+dup-def, fail-closed) / C8 `release` pipeline — code DONE, 94 tests green, verdict ship, in `origin/master`.** Remaining content long pole = the PAID enrich RUN (OpenAI $, not code). ⚠️ **HAZARD: multiple sessions committing+pushing master concurrently** — my C6–C8 code got swept into a parallel agent's `git commit -a` under a mislabeled analytics message (no work lost, but entangled). Rule: isolate parallel agents in git worktrees; never `git add -A`/`commit -a` on a shared tree; re-verify `HEAD`/`origin` live. Handoff git claims were FALSE again.
