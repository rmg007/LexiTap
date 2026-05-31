---
title: LexiTap Master Release Plan
status: active
updated: 2026-05-30
supersedes-ordering-in: ROADMAP.md, lexitap-docs/02-product-definition/ROADMAP.md
---

# LexiTap — Master Release Plan (current state → live on both stores)

> ⚠️ **MONETIZATION MODEL CHANGED 2026-05-31 — this plan predates it.** The
> subscription / Premium-Pass / standalone-$1.99-Common3k model assumed throughout
> the RevenueCat tasks (A1, R1–R6), decision rows (D2, D8), and content tasks
> (C9, C11) is **dead**. New model: free frequency/CEFR content + universal audio,
> one-time **exam packs ($9.99)** + **All-Exams bundle ($29.99)** + upgrade SKUs,
> **no subscriptions**, B2B deferred. Authoritative:
> [../lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md](../lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md)
> + [../memory/2026-05-31_monetization_rethink.md](../memory/2026-05-31_monetization_rethink.md).
> Rows below are annotated where directly affected, but **a full task-by-task
> reconciliation of the RevenueCat block is still pending** — treat the new pricing
> doc as the source of truth on any conflict.

A concrete, dependency-aware execution plan from today's verified state to a public App Store + Google Play launch. Built from a full code + docs audit (2026-05-30) across six domains. **This plan overrides the phase *ordering* in the two ROADMAP files where they conflict** (auth timing, content scope, Phase 2 "no coding"); the strategy/spec docs in `lexitap-docs/` remain canonical for *content*.

> Effort key: **S** = hours · **M** = 1–3 days · **L** = a week or more. Task IDs (H-1, C0, R4, AU2…) are stable references used in the critical path and risk register.

---

## 0. Status — fixes applied 2026-05-30 (this session)

The audit's code-level bugs were verified against current `master` and **fixed**. What changed:

| # | Fix | State | Evidence |
|---|---|---|---|
| **C0** | words.db delivery: bundle `mobile/assets/vocab/words.db`, register `.db` in Metro, embed via the `expo-asset` plugin, copy into expo-sqlite's dir (version-gated) **before** ATTACH | ✅ **PROVEN on iOS simulator 2026-05-31** (cold launch → ATTACH → 43 rows queried at the time → onboarding renders; DB has since been expanded to 2,881 words). Getting there exposed TWO runtime bugs the original "done in code" missed because `npm run check` can't see them: (1) **dual React** ($$typeof crash) and (2) **bare-name `ATTACH 'words.db'`** resolving vs CWD not the SQLite dir — the actual C0 bug. Both fixed (PR #7). ⚠️ **Physical iOS + low-end Android still pending** (fresh EAS build in flight; `0324f457` is stale). See [../memory/2026-05-31_ios_build_posthog_metro.md](../memory/2026-05-31_ios_build_posthog_metro.md). | `infrastructure/db/contentDb.ts`, `contentDbInstall.ts`(+test), `database.ts`, `metro.config.js`, `app.json` |
| **A1** | `tiers.ts` rewritten to one-time exam-pack + bundle products: 5 exam packs ($9.99 each, per-pack entitlements), All-Exams bundle ($29.99, `all_exams` entitlement), 2 upgrade SKUs ($19.99/$9.99, gated). Free categories (Foundation, Advanced, Common 3K/9K) carry no product. `TierUnlock` separates content tier from store product; `TierMeta` exports `isFree` + `entitlementId` for R5 access checks. STORE_PRODUCTS array is source of truth for RevenueCat sync (Stage 4). | ✅ **Done** | `config/tiers.ts` (a85d8d9) |
| **C2** | Empty/unpurchasable tiers set `isActive:false` — only free Foundation + Advanced ship in P1 | **Done** | `config/tiers.ts` |
| **HARNESS** | **`npm run check` was red on `master`** — `nativewind/babel` (a NativeWind v4 *preset*) was under Babel `plugins`, breaking every Jest suite. Moved to `presets`, skipped in test env (it loads `react-native-worklets/plugin`, a reanimated-v4 artifact absent on reanimated 3). | **Done** — 132 tests / 15 suites green | `babel.config.js`, `@babel/core` pinned 7.25.2 |
| **D7** | **Resolved: B2B seat-redemption code is GONE** (stripped in the 2026-05-28 cleanup; zero refs in `mobile/`). | **Decision: drop B2B from the initial launch — ship pure-B2C**, add institutional seat tokens as a fast-follow. The 3.1.3(c) App-Review story is not attempted at v1. | `grep` of `mobile/` |

**Not fixed (out of a code session's reach — these are the plan, not bugs):** content enrichment to 3k words, Apple/Google enrollment, EAS dev client, RevenueCat/auth/backup wiring, store submission. See the phase plan below.

## Phase plan at a glance (now → live on both stores)

One scannable list. Each phase has an ordered task set and a single measurable exit gate. IDs map to the detailed domain plans in §A–F. **✅ = done this session.**

**P1 — Make the app real** *(exit: cold-launches on real iOS + Android, loads real Foundation words, completes onboarding→quiz→progress, emits retention events)*
- ✅ C0 words.db delivery (code) · ✅ A1 tiers model · ✅ C2 tier activation · ✅ test harness green
- ◐ **Prove C0 on a physical device** — ✅ proven on iOS **simulator** (after fixing dual-React + bare-name-ATTACH bugs); physical iOS + low-end Android still pending (fresh EAS build in flight)
- ☐ Foundation content to 3,000 words: C3 source → C4 OpenAI enrich adapter → C5 sampled QA → C6 synonyms → C7 validate → C8 release pipeline *(the long pole — runs continuously)*
- ◐ Real onboarding + Home: **H-1 Home progress ✅ → O-1 persist `onboarding_state` ✅ → O-2 goal ✅ → O-4 diagnostic ✅ → O-5 knowledge map ✅ → P-1 empty states ✅**; P-2 a11y polish *(O-3 proficiency screen cut)*
- ◐ Instrumentation: A1–A5 PostHog + `event_log` flush; **B1 Sentry ✅ + B2 scrub ✅** (B2 enrichment tags pending A2) *(without this P2's gate is unmeasurable)*
- ☐ Build infra: eas init, `app.json→app.config.ts`, eas.json profiles, CI two-job, signing (build-infra #1–14) · **start Apple+Google enrollment day 1**

**P2 — Beta + retention** *(exit: D7 ≥ 30% on `anon_id` cohorts; 20–30% → fix loop; <20% → pivot/kill)*
- ☐ A7 retention dashboard (the keystone) · TestFlight external + Play Closed · recruit 60–70 (net ≥50 active) · D1 manual QA matrix + D2 Maestro smoke · run ≥1 week, read A7
- ⚠️ Struck from the old roadmap: "device-switch/sync test" (sync doesn't exist) and "no coding" (instrumentation is coding)

**P3 — Money + identity** *(exit: 10 paying users; rethink if <5)*
- ☐ A0 leave Expo Go (EAS dev client) — **gates all of P3** · R1–R7 RevenueCat B2C · AU1–AU3 auth (magic-link + Google + SIWA) · BK1–BK2 encrypted backup · C9 TOEFL tier + ElevenLabs audio
- ✂️ B2B seat token (B2B1) **deferred** per D7 — pure-B2C this phase

**P4 — Breadth** *(exit: $1,000/mo recurring)*
- ☐ C11 IELTS / Business / Common3K tiers · W-1 Classification widget · UX polish · (W-2 ImageMatch + C10 images only if curation pays off — likely deferred)

**P5 — Launch** *(exit: live on both stores)*
- ☐ ASSET-1/2 store assets · LEGAL-1…5 (age gate, account deletion 5.1.1(v), privacy labels, DPAs) · WEB-1 static site (B2B = contact form, no checkout) · REVIEW-1 App-Review battle plan · SUBMIT-1/2/3 — **iOS submission gated on SIWA + account deletion**

**P6 — Growth** *(exit: 1,000 active users)*
- ☐ Reddit/ASO · store-approved trial referrals · monthly content drops via the C8 pipeline (as store builds — they add IAP, not OTA-safe) · institutional seat tokens fast-follow

**The five things that move the date** (unchanged): prove C0 on device → Foundation content (C3–C8) → leave Expo Go (A0) → Apple/Google enrollment + review latency → auth (AU1–AU3, the iOS-submission gate).

---

## 1. Reality check — the roadmap is ahead of the code

The roadmaps say "Phase 1 ~85% complete, app runs, sync done, content sourced." **The code says otherwise.** The honest picture:

| Roadmap claim | Verified reality |
|---|---|
| "Phase 1 ~85% — working app" | ✅ **Fixed in code 2026-05-30.** Was: `database.ts` did `ATTACH DATABASE 'words.db'` on a *bare filename*; nothing copied the bundled DB; `assets/vocab/` was empty → ATTACH silently created an empty DB and every content query returned 0 rows. Now: DB bundled + embedded, version-gated copy before ATTACH, unit-tested. **Remaining: prove on a physical device** — Metro/simulator is not sufficient evidence. |
| "Foundation (3,000) + TOEFL (3,000) word lists sourced" | `words.db` contains **2,881 unique words / 2,894 tier memberships** (foundation 2,848, advanced 10, toefl 6, + 6 exam/common tiers × 5 stubs). The input CSVs back this. **Foundation is now ~95% sourced (2,848/3,000); TOEFL + exam tiers remain stubs**, and no real enrichment pipeline exists (all providers are stubs). |
| "sync service done… free cloud sync" | Per-table sync + `SupabaseSyncService` + entitlement use-cases were **deleted 2026-05-28**. Encrypted blob backup is **not written**. The root ROADMAP line is stale. |
| "auth → Phase 5" | The canonical docs already contradict this: SIWA + Google + magic-link are **Phase 3**. Encrypted backup and B2B seat activation both need `auth.uid()`, so auth *must* precede them. Following ROADMAP literally blocks backup + B2B on auth that "won't exist for two phases." |
| onboarding / Home are fine for beta | Onboarding steps 2/3/5/6 are placeholder buttons; HomeScreen daily progress is **hardcoded to `0`**. A Phase 2 retention test on this build is meaningless. The diagnostic is a trivial stride sampler, **off-spec** vs the adaptive band-walk the Knowledge Map needs. |
| IAP deferred, harmless stub | ⚠️ **`tiers.ts` must be rebuilt (model changed 2026-05-31).** The 2026-05-30 "3-SKU subscription catalog" (`premium.monthly`/`.annual` + `common3k`) is now **also dead**. Target: one-time **exam-pack products ($9.99)** + **All-Exams bundle ($29.99)** + upgrade SKUs; free categories carry no product. See [REVENUE_MODEL_PRICING.md](../lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md). |

**Net:** the *domain logic* (SRS, scheduling, mastery, quiz session, DB schema, 2 widgets) is genuinely done and tested — that's real and valuable. But "app + content + release infra" is closer to **~30% to launch** than 85%. The single biggest correction: **content enrichment is the long pole, and the content delivery path is currently broken.**

---

## 2. Decisions required *now* (these block coding)

These are not open-ended; each has a recommendation. They are doc contradictions or product calls that must be settled before the dependent work starts, or you build on sand.

| # | Decision | Recommendation | Blocks |
|---|---|---|---|
| D1 | **Diagnostic: adaptive band-walk (spec) vs stride sampler (built)?** | ✅ **RESOLVED 2026-05-31: downscope to DIAG-B stride sampler for Phase 2 beta.** The spec calls for DIAG-A (adaptive staircase over frequency rank, confirm-on-Yes, pseudo-words, SE stopping). Current code is DIAG-B (5-word even-stride sample). Shipping DIAG-B: (1) unblocks beta on time; (2) frontier-rank estimate (`estimateFrontierFromResults()` → 0%→rank 500, 100%→3500, linear) is crude but sufficient for Knowledge Map endowed-progress ("You know ~X words"); (3) real learner data informs full DIAG-A design post-launch. DIAG-A requires a pseudo-word library that does not exist and IRT-level design work; deferring is the right call. **Frontier estimate is linear + crude** (no IRT, no difficulty-band bucketing, no pseudo-word correction) — document this in KM UI as a *beta estimate* to set learner expectations. | O-4, O-5, KM screen |
| D2 | ~~Trial vs intro price~~ | ⊘ **MOOT 2026-05-31** — no subscription exists, so no trial/intro-price question. One-time packs only. | R1, REVCAT-1 |
| D3 | **Auth: magic-link vs email/password?** — SECURITY_MODEL said password (Argon2); everything else said magic-link. | ✅ **RESOLVED 2026-05-30: magic-link** (`signInWithOtp`), never store passwords. SECURITY_MODEL fixed. | AU1, AU2 |
| D4 | **Backup encryption key model** — API_CONTRACT said "client AES + Vault key"; SECURITY_MODEL said "no app-level encryption." | ✅ **RESOLVED 2026-05-30: Storage server-side-encryption-at-rest + RLS path-scoping; no client AES.** API_CONTRACT / SECURITY_MODEL / SYSTEM_ARCHITECTURE aligned (path is `{uid}/user.db`). | BK1, BK2 |
| D5 | **Age gate / COPPA stance** | ✅ **RESOLVED 2026-05-31: 16+ global, neutral DOB gate, no parental-consent path, delete-on-discovery.** Adult audience avoids "Made for Kids"; a gate neutralizes the minor-signup trap cheaply. Do *not* build a child-consent flow. **Screen:** `OnboardingAgeGateScreen` (route: `/onboarding/age`), first step before Welcome. **Logic:** DatePickerIOS/Android, local age calc, if <16 show error + stay on screen (no navigation), if ≥16 advance to Welcome. **Storage:** none (pre-account gate). **Post-launch:** flag <16 accounts for manual legal+support escalation, not automated. See `mobile/ONBOARDING_AGE_GATE.md`. | LEGAL-1, LEGAL-4 |
| D6 | **B2B at launch: self-serve web portal vs manual invoice?** | ✅ **RESOLVED 2026-05-31: Manual invoice.** A live B2C checkout on lexitap.app is an App Review risk (3.1.1) and weeks of PCI/tax work. Static site + "contact sales, min 10 seats" + manual Supabase provisioning; B2B seat activation deferred to fast-follow (invite tokens via Supabase). | WEB-1, REVIEW-1 |
| D7 | **Was B2B seat-redemption code deleted 2026-05-28, and is it rebuilt?** | **✅ RESOLVED 2026-05-30: it's gone (zero refs in `mobile/`). Decision taken: drop B2B from the initial launch — ship pure-B2C**, add institutional seat tokens as a fast-follow. B2B1/REVIEW-1's 3.1.3(c) story is not attempted at v1. | ~~B2B1, REVIEW-1, SUBMIT-2~~ (deferred) |
| D8 | ~~"Common 3000" ($1.99) vs free Foundation 3000 — heavy overlap.~~ | ✅ **RESOLVED 2026-05-31.** The overlap is the *point*, not a bug: words carry **many-to-many** category tags (a word is in Foundation AND Common 3000 at once). Both Most Common 3000 and 9000 are now **free** categories; the $1.99 standalone SKU is **cut**. Paid content = one-time exam packs only (TOEFL, IELTS, Business, GRE, GMAT at $9.99 + All-Exams bundle at $29.99). Reflected in `config/tiers.ts`: Common 3K/9K have `unlock: { kind: 'free' }`, no product; exam packs have `unlock: { kind: 'exam_pack', sku, entitlementId }`. | C11, A1 |

---

## 3. Corrected phase structure

Same six-phase skeleton, but with the ordering bugs fixed. **Bold = change from the published roadmap.**

| Phase | Theme | Key contents | Gate (measurable) |
|---|---|---|---|
| **P1** | Make the app real | **Fix words.db delivery (C0)** · full Foundation content (C3–C8) · finish onboarding + Home (O-1…O-5, H-1) · **analytics + Sentry wired (A1–A5, B1–B2)** · EAS/signing/CI (build-infra 1–14) | App cold-launches on real iOS + Android, loads real Foundation words, completes onboarding→quiz→progress, **emits retention events** |
| **P2** | Beta + retention | Recruit 60–70 (net ≥50 active) · TestFlight external + Play Closed · **retention dashboard (A7)** · manual QA matrix + Maestro smoke | **D7 ≥ 30%** (anon_id cohorts). 20–30% → fix loop; <20% → pivot/kill. **(Strike the "device-switch/sync test" — sync doesn't exist yet.)** |
| **P3** | Money + identity | **EAS dev client (A0)** · RevenueCat B2C (R1–R7) · **auth: magic-link + Google + SIWA (AU1–AU3)** · encrypted backup (BK1–BK2) · B2B seat token (B2B1) · TOEFL tier + ElevenLabs audio (C9) | 10 paying users + 2 paid schools (rethink if <5) |
| **P4** | Breadth | IELTS / Business / Common3K tiers (C11) · Classification widget on `theme` (W-1) · images + ImageMatch **only if curation pays off** (C10, W-2) · UX polish | $1,000/mo recurring |
| **P5** | Launch | Store assets (ASSET-1/2) · legal + account deletion + age gate (LEGAL-1…5) · privacy labels · App Review battle plan (REVIEW-1) · website (WEB-1) · submit (SUBMIT-1/2/3) | Live on both stores |
| **P6** | Growth | Reddit/ASO · teacher referral (store-approved trial only) · monthly content drops (reuse C8 pipeline) | 1,000 active users |

**Three structural corrections, stated plainly:**

1. **Auth moves from P5 → P3.** It is a hard dependency of encrypted backup and B2B seat activation, and Apple Guideline 4.8 forces SIWA the moment Google Sign-In ships. RevenueCat B2C can ship *before* auth (anonymous app-user-id; call `Purchases.logIn(supabaseUserId)` later to alias). But auth, backup, and B2B all live together in P3.
2. **Analytics + crash monitoring move into the tail of P1**, not P2. The P2 retention gate (D7 ≥ 30%) is **unmeasurable** without PostHog retention + an offline `event_log` flush + Sentry. The roadmap's "Phase 2 = no coding" is false. A beta build with no instrumentation forfeits the entire phase.
3. **Content (Track A) is the launch long pole, runs continuously from P1**, and gates everything visible. It is not a P3/P4 afterthought.

---

## 4. Critical path & long poles

The chain that determines the ship date (everything else parallelizes around it):

```
C0 (fix words.db delivery, prove on device)         ← URGENT, gates the whole app
   └─> C3→C4→C5→C6→C7→C8 (Foundation content: source→AI-enrich→sampled QA→export)   ← LONG POLE
H-1, O-1✅→O-2✅→O-4✅→O-5✅ (Home + onboarding real)                ← gates P2 beta credibility *(O-3 cut)*
   └─> A1→A2→A3→A4→A5 + B1→B2 (instrumentation)      ← gates P2 measurability
        └─> [P2 beta: ≥1 week data] → D7 gate
A0 (leave Expo Go / EAS dev client)                  ← gates ALL of P3 monetization+auth
   └─> R1→R2→R3→R4→R5→R6 (RevenueCat)  +  AU1→AU2→AU3 (auth)  →  BK1→BK2 (backup), B2B1 (seat)
ACCT-1 (Apple/Google enrollment) ──────────────────► (external latency, start day 1)
   └─> BUILD-1→BUILD-2 → SUBMIT-1 → [SIWA done] → SUBMIT-2 (iOS review, 1–2wk buffer)
```

**The five things that actually move the date:**

1. **C0 — words.db delivery.** A live bug, not a future task. Until proven on a *physical device build* (not Metro/simulator), every other claim is unverified. Do first.
2. **Foundation content enrichment (C3–C8).** Sourcing a 3k frequency list is hours; producing 3,000 ESL-register definitions + single-blank example sentences is the bottleneck. Hand-authoring ≈ weeks; even *reviewing* AI drafts at 20s/word ≈ 17 hours. **Plan = AI-draft (OpenAI adapter, ~$30–90) + sampled QA (10–15% + 100% of validator-flagged) + in-app error reporting as the long-tail fix.** 100% manual review of 3k–6k words is not realistic solo — don't pretend it is.
3. **Leaving Expo Go (A0).** RevenueCat, Google Sign-In, Apple auth are all native modules — none run in Expo Go. All of P3 is blocked on the EAS dev client + signing existing.
4. **Apple/Google enrollment + Apple review (ACCT-1, SUBMIT-2).** External latency: Apple ~24–48h enroll; Google's new-account closed-test rule can add **14 days** before production; iOS first review 1–3 days + budget a **1–2 week rejection/resubmit buffer**. Start enrollment on day one.
5. **Auth (AU1–AU3) as the iOS submission gate.** Account deletion (Apple-mandated once accounts exist) and SIWA both block iOS submission. If auth slips, the store launch slips 1:1. Fallback: descope to pure-B2C launch, add institutional tokens fast-follow.

---

## 5. Risk register

| Risk | Severity | Detail | Mitigation |
|---|---|---|---|
| words.db loads empty on device | ~~Critical~~ → **Mitigated** | Was real: bare-name ATTACH resolved vs CWD → "unable to open database"; fixed to absolute-path ATTACH and **proven on the iOS sim** (43 rows at the time). Physical-device confirm still pending. (The pre-restore content-volume gap — 43 rows vs documented content — is **closed**: bundled DB now holds **2,881 words / 2,894 memberships**.) | Fixed (PR #7) + `npm run smoke` guards it; confirm on physical iOS + low-end Android |
| Content review doesn't scale solo | **High** | ~17h to review 3k words; 6k doubles it | Sampled QA gate + in-app error reporter; AI-draft not hand-author |
| B2B seat-redemption code was deleted, not rebuilt | **High** | Entire 3.1.3(c) App Review story depends on it (D7) | Verify now; rebuild (B2B1) or drop B2B from launch |
| Everything in P3 blocked on Expo Go exit | **High** | 3 native modules; New-Arch (`newArchEnabled:true`) compat unverified | A0 early; confirm RevenueCat/Google/Apple libs on New Arch at pinned versions |
| iOS review rejection | **High** | 3.1.3(c) B2B, missing SIWA, paywall terms, privacy-label mismatch, missing account deletion, website B2C undercut | Pre-empt all six (REVIEW-1, AU3, REVCAT-1, kill sync claims, LEGAL-4, WEB-1); 1–2wk buffer |
| Stale `tiers.ts` → wrong store SKUs | **Med** | Encodes dead per-tier $9.99 model | A1 before any store/IAP config |
| EAS build minutes blow the $194 budget | **Med** | Free tier ~30 builds/mo; signing iterations burn them | `eas build --local` for iteration; cloud builds only for uploads |
| Live doc contradictions implemented as-is | **Med** | Trial-vs-intro, magic-link-vs-password, backup key model | Resolve D2/D3/D4 + fix docs *before* coding |
| Apple Paid Apps agreement not signed | **Med** | Products silently return empty until tax/banking done | Start R1 banking/tax forms early (days of latency) |
| Privacy label advertises sync that doesn't ship | **Med** | "Cloud sync" screenshot/claim is now false | Replace Screen 3 with offline messaging; Data Safety = no sync |
| CI assumes single root package.json | **Low** | Two-project repo; doc's root `npm ci` errors | Two jobs, `working-directory`, path filters; trigger on `master` not `main` |
| OTA bricks installs via runtimeVersion mismatch | **Low** | Bundled DB is native asset, not OTA-safe | `runtimeVersion: appVersion`; DB/native changes → store build only |

---

## 6. Immediate next actions (first ~2 weeks, in order)

1. ◐ **C0 (PROVEN on iOS simulator 2026-05-31)** — `words.db` delivery fixed + unit-tested AND verified on the sim (cold launch → ATTACH → 43 rows at the time → UI renders; DB since expanded to 2,881 words), after fixing two runtime bugs `npm run check` missed (dual React; bare-name ATTACH). **Remaining: confirm on a physical iOS + low-end Android build** (fresh EAS build in flight; `0324f457` is stale). New harness: `cd mobile && npm run smoke`.
2. **ACCT-1 / build-infra #8–9** — start Apple ($99) + Google ($25) enrollment *today* (external latency). **Top remaining priority.**
3. ✅ **D2/D3/D4/D7 resolved**; **D1/D5/D6/D8 still open** (diagnostic scope, age gate, B2B model, Common3K-vs-Foundation) — settle before dependent coding.
4. ✅ **A1 (done)** — `tiers.ts` is now the real Premium-Pass entitlement model; empty tiers `isActive:false`.
5. ✅ **H-1 + O-1 (done)** — Home shows real daily progress (`dailyProgressQueries` → container injects now/tz → `HomeScreen`, no hardcoded `0`, offline→zero-state, unit-tested); `onboarding_state` persists end-to-end (`SaveOnboardingProfileUseCase` + defensive parse). Both already on `master` (commit `5808079`). **O-2 (goal screen) is now the head of the onboarding chain** — it's what actually populates `goal`/`band`/`frontierRank`.
6. **eas init + eas.json + migrate app.json → app.config.ts** (build-infra #1, #4; needed for env injection).
7. **C3 + build the OpenAI enrichment adapter (C4)** — kick off the content long pole early; it runs for weeks behind everything else.
8. **Correct the two ROADMAP files** — they are actively misleading (auth timing, sync, content scope, "Phase 2 no coding"). Either point them at this plan or fix the specific lines flagged here.

---

# Domain execution plans

The six detailed, task-level plans below were produced in parallel and lightly edited for consistency. Each is self-contained with done-criteria, dependencies, effort, and file paths.

---

## A. Mobile App Feature Code — Current State to Launch

Scope: onboarding screens, Home daily-progress, Settings, ImageMatch/Classification widgets, local push, presentation polish.

### Findings (read first)

1. **The implemented diagnostic is off-spec.** `mobile/src/domain/onboarding/diagnostic.ts` + `RunDiagnosticUseCase.ts` are a trivial 5-word even-stride sampler. `ONBOARDING_FLOW_SPEC.md` mandates an adaptive band-walk (staircase over frequency rank, confirm-on-Yes, pseudo-words for overclaim, SE stopping rule, frontier-rank → known-count). The current diagnostic produces **no frontier rank**, so the Knowledge Map Reveal has nothing real to show. **Decision D1**: downscope to the stride sampler for beta.
2. ✅ **`onboarding_state` is now fully wired (O-1 done).** `SaveOnboardingProfileUseCase` → `SQLiteUserStatsRepository.saveOnboardingProfile` → `upsertOnboardingState` writes the JSON blob (touches only that column); `selectStats` → `parseOnboardingState` reads it back onto `UserStats.onboardingState`, defensively (corrupt → no profile, never throws). Remaining: the upstream **screens** (O-2 goal, O-4 diagnostic) that actually fill `goal`/`band`/`frontierRank` — production only writes `{completedAt}` until those ship.
3. **Onboarding completion lives in AsyncStorage, not the DB.** The gate flag in AsyncStorage is fine — and the profile (goal/band/frontier) now persists to `user_stats.onboarding_state` via O-1. Gap is only the screens that populate those fields.
4. **ImageMatch is blocked by content, not code.** The widget is fully built and renders from `imageUri`, but the image provider is a Noop, no images are sourced, no asset-bundling path exists. Hard-blocked on content-tool.
5. **Classification is close** — fully built, needs only bucket data; `Word.theme` already exists end-to-end. A Phase 4 quick win.
6. ✅ **Home `0` is fixed (H-1 done)** — `HomeScreen` shows real `reviewsCompletedToday/effectiveDailyCap` + remaining new-word budget from `dailyProgressQueries`. The remaining P1 prerequisite here is the onboarding **screens** (O-2…O-5), not Home; both are P1, not the Phase 4 work the stub comments claim.

### Phase 1 — make the beta credible

- ✅ **H-1 · Wire HomeScreen real daily progress** — **DONE** (on `master`, commit `5808079`; unit-tested in `dailyProgressQueries.test.ts`). "Ready for today" bar reflects `reviewsCompletedToday / effectiveDailyCap`; "Learn new words" shows remaining new-word budget vs `FORGIVENESS.NEW_WORDS_PER_DAY`; no hardcoded `0`. `getDailyProgress(tierId, nowMs, tz)` lives in `queries/dailyProgressQueries.ts`; `container.ts` injects `now`/`tz` and exposes a `getDailyProgress(tierId)` over `ServicesContext`. Offline failure → zero-state, never an error. *Touched:* `HomeScreen.tsx`, `ServicesContext.tsx`, `container.ts`, `queries/dailyProgressQueries.ts` (+test), `mockServices.ts`.
- ✅ **O-1 · Persist onboarding_state** — **DONE** (on `master`, commit `5808079`). Typed `OnboardingState` (goal, band, optional frontier, required `completedAt`) written to `user_stats.onboarding_state` JSON and read back; `SaveOnboardingProfileUseCase` + `upsertOnboardingState` (touches only that column); `parseOnboardingState` reads defensively (corrupt → no profile, never throws — 8 mapper + 3 use-case cases). *Touched:* `domain/onboarding/OnboardingState.ts`, `domain/user/UserStats.ts`, `statsQueries.ts`, `mappers.ts`, `SQLiteUserStatsRepository.ts`, `application/onboarding/SaveOnboardingProfileUseCase.ts`, `ServicesContext.tsx`, `container.ts`. **Unblocks O-2/3/4.** Production currently writes only `{completedAt}` — `goal`/`band`/`frontierRank` stay empty until O-2/O-4 ship the screens that fill them.
- ✅ **O-2 · Goal-selection screen (real)** — **DONE** (commit TBD). Thread goal from goal-selection → diagnostic. Add goal→CEFR-band default (`goalToStartingBand` in diagnostic.tsx); band persisted with goal + completedAt to `onboarding_state`. SelectionCard a11y verified (accessibilityRole=radio, accessibilityState.selected, 72pt touch target). All 159 tests green. *Deps:* O-1.
- ✂️ **O-3 · Proficiency screen — cut** — DECISION: **cut** per D1. Spec calls for self-segment (frequency rank), not CEFR proficiency. Proficiency screen was off-spec and redundant. Route goal → diagnostic directly. *Deps:* O-1.
- ✅ **O-4 · Diagnostic (DIAG-B)** — **DONE** (commit TBD). Stride sampler (5 words, even-difficulty spans) now computes frontier-rank estimate from results: `estimateFrontierFromResults()` maps % correct → frequency rank (0% → rank 500, 100% → rank 3500). Persists to `onboarding_state.frontierRank` alongside goal/band/completedAt. All 163 tests green. Next: O-5 (Knowledge Map reveal using frontierRank). *Deps:* O-2 ✅.
- ✅ **O-5 · Knowledge-map-reveal (real)** — **DONE** (commit TBD). Reads frontierRank from onboarding_state (O-4 output), computes segment counts: Known = frontier, Learning = ~500-word band, New = remainder. Displays animated segmented bar (success/accent/tertiary) + count (~{n} words) + endowed-progress copy ("You already know..."). Animated reveal uses `react-native-reanimated` with `motion.slow` (360ms), respects Reduce Motion (static fallback). Routes "Start learning" → paywall. All 163 tests green. *Deps:* O-4 ✅.
- **P-1 · Presentation states** — M. Quiz/Progress/Home handle resolving services, `NoWordsAvailableError` → friendly empty state, read failures → zero-state, never assume network. *Deps:* none.
- **P-2 · Accessibility pass** — M, per `ACCESSIBILITY_REQUIREMENTS`. ≥44pt targets, roles/labels/state on every Pressable, live regions on feedback, Reduce Motion on KM, contrast verified. *Deps:* screens exist.

### Phase 2 — Settings

- **S-1 · Data management + reset progress** — M. Destructive "Reset progress" behind a confirm sheet; clears `user_progress`/`quiz_attempts`/`quiz_sessions`, resets `user_stats` preserving `onboarding_state`; never touch read-only `words.db`. New `ResetProgressUseCase`. *Deps:* O-1.
- **S-2 · Account section placeholder** — S. Inert "Sign in — coming soon" section so the screen isn't visibly incomplete in beta (auth ships P3). *Deps:* none.

### Phase 4 — advanced widgets (gated on content)

- **W-1 · Classification integration** — M. Buckets from `Word.theme`; question generator picks a word + 2–3 sibling themes as distractor buckets; register in the assessment selector. *Deps:* Foundation has populated `theme` (verify; if sparse, slips). Low content dependency.
- **W-2 · ImageMatch integration** — L, **BLOCKED**. All four blockers live in content-tool (Noop image provider, no licensing, no asset-bundling, no `imagePath`→widget plumbing). **Defer past initial launch** — most expensive widget for least pedagogical lift; abstract words have no sensible image.

### Push notifications

- **N-1 · Local SRS reminder** — M. Install `expo-notifications`; one daily local notification at a user-set time, fired in the user's IANA timezone, suppressed if already reviewed today, respecting `notification_schedule.quiet_hours_*`. Permission + time toggle in Settings. *Deps:* H-1 (the "reviewed today?" signal). **Build minimal (single local reminder); no remote push / per-word flooding.** Safe to slip to early P2; O-* and H-1 are not.

**Roadmap conflicts:** stub comments claim "Phase 4 will implement" for goal/proficiency/KM — **wrong, they gate the P2 retention test** (only the paywall is legitimately P3+). The diagnostic is "done" but off-spec. ImageMatch is mis-filed as a P4 *widget* task — the app code is done; the real work is a P4 *content* task.

---

## B. Content Supply Chain (content-tool/ + words.db) — the long pole

### State (trust over docs)

- **`words.db` has 2,881 unique words / 2,894 memberships** (foundation 2,848, advanced 10, toefl 6, + 6 exam/common tiers × 5). Foundation is ~95% sourced vs the "top 3,000" target; TOEFL + exam tiers remain stubs and enrichment quality is unverified.
- **The app cannot load it on device** (see C0) — ATTACH on a bare filename, no asset copy, empty `assets/vocab/`. Silently opens an empty DB.
- **No real enrichment.** All providers in `defaultProviders.ts` are stubs (synonyms empty, image null, audio path-only). `KNOWN_PROVIDERS` lists openai/elevenlabs/unsplash but no adapter is implemented. The 200 Foundation rows carry founder-supplied definitions/sentences in CSV.
- **Distractors are runtime**, not a content field (`domain/quiz/distractors.ts`) — but quality is a function of pool size, so tiny tiers = garbage distractors until populated.
- **Doc-vs-code drift:** `CONTENT_PIPELINE_ARCHITECTURE.md` / `SEED_DATA_SPEC.md` describe a `definition_status` state machine, `enrich --add-definitions`, and a `review-definitions` command — **none exist in code.** Docs describe an unbuilt review pipeline as shipped.
- **Config drift:** `lexitap.config.json` defines 3 tiers; only Foundation should be active — gate `advanced`/`toefl` or they ship empty.

### Tasks

- **C0 · Bundle words.db + prove it loads on device** — M, **URGENT, gates everything.** *Done:* built DB bundled as a Metro asset, copied into expo-sqlite's dir on first launch (re-copied when `content_version` changes), and a smoke test on physical iOS + Android confirms `SELECT count(*) FROM contentdb.words` returns the real count. Add `mobile/assets/vocab/words.db`; `copyContentDbIfNeeded()` via `expo-asset` + `expo-file-system` before ATTACH; `.db` in `assetExts`. *Risk:* expo-sqlite dir differs iOS/Android; must test on real devices. **This may invalidate any "quiz loop works" claim tested only against fixtures.**
- **C1 · content-version → rebundle contract** — S. App reads `PRAGMA user_version`, re-copies when bundled > installed; `build-manifest.json content_version` is the source of truth; CI fails if bundled version ≠ manifest. *Deps:* C0.
- **C2 · Reconcile config tiers vs shipped tiers** — S. Ship only tiers with real content (Foundation for P1) or flag others `is_active:0`. Confirm `SQLiteContentTierRepository` respects it. *Deps:* none.
- **C3 · Source + ingest full Foundation 3,000** — M (sourcing). Real top-3,000 frequency list (word, pos, cefr, theme), stable IDs, zero in-tier dup surface-forms. Definitions/sentences are NOT NULL at export. *Deps:* C2.
- **C4 · Build the AI definition/sentence enrichment adapter (the bottleneck)** — L. *Done:* real OpenAI adapter behind `--provider openai` + `--add-definitions/--add-examples`, generating ESL-register definitions + single-blank example sentences per SEED_DATA_SPEC, passing `validate --strict`. *Why not hand-author:* 3,000 entries ≈ weeks. Cost: ~$0.01–0.03/word → **~$30–90 for 3,000.** *Files:* new `providers/openaiProvider.ts`, `commands/enrich.ts`, `defaultProviders.ts`. *Deps:* C3.
- **C5 · Human review at realistic scale** — M (CLI) + L (review time). **100% manual review of 3k–6k words is not realistic solo** (~17h/3k at an optimistic 20s/word). *Done:* build the `review-definitions` CLI the docs reference; ship P1 on a **sampled QA gate** (random 10–15% + 100% of validator-flagged), log pass-rate, gate export on sample-pass threshold; wire in-app content-error reporting as the long-tail fix. Adds `definition_status` to working.db only (must not leak to shipped words.db — export projects an explicit column list). *Deps:* C4.
- **C6 · Synonyms/antonyms for Foundation** — S (reuses C4 adapter). Valid JSON arrays per validator rule #6. *Deps:* C4.
- **C7 · Tighten validation + provenance (backlog #41)** — M. `validate --strict` adds orphan check, dup-leak check, and a **provenance/license field** (definitions must be ORIGINAL not copied — real copyright risk; the C4 prompt must force original phrasing; a license column is documentation, not protection). Export aborts on any error. *Deps:* C4.
- **C8 · Repeatable content-release process** — M. One command/CI job: `import → enrich → validate --strict → export → version bump → copy to mobile/assets/vocab/words.db`, fail-closed. The reusable path for P6 drops. *Deps:* C0, C1, C7.
- **C9 · Audio (P3)** — L. **REVISED 2026-05-31: universal audio on ALL content (free + paid), via neural TTS (Amazon Polly / Google, ~$10) — NOT ElevenLabs** (ElevenLabs ~$100-160 for ~9k words breaks the $194 budget). Real TTS adapter synthesizes `audio/{word_id}.mp3` (word + sentence); validator asset-resolve passes; audio bundles. *Flag:* thousands of mp3s materially grow bundle size — measure; may need on-demand download (a new, undesigned mechanism). *Deps:* C4, C8 + audio asset-bundling.
- **C10 · Images for ImageMatch (HIDDEN LONG POLE)** — L+, curation-dominated. `image_path` 0/2881, Unsplash provider is a no-op. Many Foundation words (abstract: borrow, tired, negotiate) have **no sensible single image** — ImageMatch only works for a concrete-noun subset. **Defer to P4; do not block launch.** MultipleChoice + DragDrop cover the loop.
- **C11 · P4 paid exam packs: IELTS, Business English, GRE, GMAT** — L per pack (enrichment/review time; code reused). Each is a one-time $9.99 product joining the `all_exams` bundle. **REVISED 2026-05-31:** Most Common 3000/9000 are **free** categories (not paid), shipped at launch via many-to-many tags — the old "$1.99 Common 3000" SKU is cut (D8). Paid packs carry the rare academic words disjoint from the free frequency bands.

**Critical path to P1:** C0 → C1 → C2 → C3 → C4 → C5(sampled) → C6 → C7 → C8. (C9=P3, C10/C11=P4.)

---

## C. Build, Signing, Release & CI/CD

**Verified state: nothing in this domain exists.** No `eas.json`, no Expo project ID, no `.github/workflows/`, no accounts, `assets/vocab/` empty. The CI doc has two structural errors.

### Blocking problems to fix first

1. **CI doc assumes a single root `package.json`. There isn't one.** Two-project repo (`mobile/` Expo+Jest, `content-tool/` Node+Vitest). Root `npm ci` errors immediately. CI must be **two jobs with `working-directory`** + per-dir `cache-dependency-path` + path filters.
2. **words.db bundling is broken code, not just absent** (see C0). `database.ts:90` ATTACHes a bare filename against the writable dir where the file doesn't exist → throws on a real build. The "P1 = app runs both platforms" target is fake until this is proven on a device build.
3. **"$194 budget" is optimistic on EAS minutes.** Free tier ~30 builds/mo; signing iterations burn them. **Use `eas build --local` for iteration; reserve cloud builds for uploads.**
4. **OTA + bundled DB is a trap.** words.db is a native asset; DB/native/`runtimeVersion`-affecting changes **cannot ship OTA** — only pure-JS. Document before the first update or you brick clients.
5. **`npm test --if-present` is a soft gate** — make it hard `npm run check`.

### Tasks (dependency-ordered)

| # | Task | Done | Deps | Effort |
|---|------|------|------|--------|
| 1 | Expo account + `eas init` | `extra.eas.projectId`+`owner` in config; `eas whoami` works | — | S |
| 2 | **Fix words.db bundling (= C0)** | committed asset; `expo-asset` copy before ATTACH; cold-launch on a real device build opens DB | — | M |
| 3 | words.db git policy | **commit the built binary** (tiny, deterministic, no CI build step); document in GIT_WORKFLOW | 2 | S |
| 4 | `eas.json` profiles | `development`/`preview`/`production`, iOS+Android, `runtimeVersion:{policy:"appVersion"}` | 1 | M |
| 5 | Versioning | `app` version = semver source; production `autoIncrement:true`; RT policy `appVersion` | 4 | S |
| 6 | CI PR gate (two-job monorepo) | `ci.yml` with `mobile-check`+`content-tool-check`, `working-directory` set, per-dir cache, path filters, trigger on **`master`** | — | M |
| 7 | expo-doctor + SDK audit | clean; **stay on SDK 52 for launch**; verify paper/reanimated/gesture-handler New-Arch compat | 1 | S |
| 8 | **Apple Developer enroll** ($99) | active; Team ID captured | — (24–48h) | S+wait |
| 9 | **Google Play enroll** ($25) | active; **new accounts may face a 20-tester/14-day closed-test gate — start early** | — | S+wait |
| 10 | iOS signing (EAS-managed) | cert+profile auto; `eas build -p ios --profile preview` succeeds | 4,8 | M |
| 11 | Android keystore + Play App Signing | EAS upload keystore; enroll Play App Signing; preview build installs | 4,9 | M |
| 12 | Secrets | `EXPO_PUBLIC_*` for public keys; server-only via `eas secret`; `EXPO_TOKEN` in GH; `.env` git-ignored | 1 | S |
| 13 | EAS Update/OTA channels | `expo-updates`; channels mapped to profiles; OTA-vs-store-build boundary documented | 4,5 | M |
| 14 | First internal build → TestFlight + Play Internal | `build --profile preview -p all` → `submit`; installs + cold-launches on real devices (proves task 2 end-to-end) | 10,11,2 | M |
| 15 | Channel→track mapping | preview→internal; preview-external→beta (P2); production→stores; submit configs carry ASC API key + Play SA JSON as EAS secrets | 14 | S |
| 16 | CI release-build trigger (optional) | `release.yml` on `push: tags v*`, `expo-github-action`+`EXPO_TOKEN`, `working-directory: mobile` | 6,10,11 | S |
| 17 | Hard test gate | `ci.yml` uses `npm run check`; required-status on `master` | 6 | S |
| 18 | Submission dry-run | walk DEPLOYMENT_RELEASE_RUNBOOK with a production build to TestFlight external before real review | 14,15 | M |

**Sequencing:** start **8 + 9 on day one** (external latency; Google's 14-day gate can block production). Tasks 1–7 proceed locally in parallel. Task 2/14 must be proven on a **real device build**, not Metro/simulator. Don't build on every PR. Fix the doc's hardcoded `main` → `master`.

---

## D. Monetization, Auth & Backup

### Blunt sequencing truth

The "Phase 3 IAP vs Phase 5 auth" conflict exists only in the **stale root ROADMAP** — the canonical docs already resolved it: `APP_STORE_DISTRIBUTION_STRATEGY.md:71` says **SIWA ships in Phase 3 alongside Google**; `API_CONTRACT.md:33` lists all three providers with no phasing split. Real chain:

1. **RevenueCat does not need your auth** — uses its own anonymous app-user-id; restore works off the store account. **B2C subscriptions can ship before auth.**
2. **Encrypted backup AND B2B seat activation both require `auth.uid()`** — backup path is `{user_id}/user.db`. **Neither ships without auth.**
3. So auth lands **with/just after RevenueCat in P3**, not P5. After sign-in call `Purchases.logIn(supabaseUserId)` to alias the anonymous id.

**Recommended order:** RevenueCat B2C → Auth (3 providers) → entitlement gating → backup/restore → B2B seat. **Nothing starts until A0** (native modules can't run in Expo Go).

### Pre-work

- **A0 · Migrate off Expo Go → EAS dev client (prebuild)** — M config / L with signing. The hard gate for the whole domain. *Done:* `npx expo prebuild` succeeds; dev build installs on physical iOS + Android; existing SQLite/quiz flow intact. *Risk:* confirm RevenueCat + `@react-native-google-signin` + Apple auth are New-Arch compatible (`newArchEnabled:true` is set).
- **A1 · Rebuild `tiers.ts` to the one-time exam-pack model (2026-05-31)** — S. The current file's subscription catalog (`premium.monthly`/`.annual` + standalone `common3k`) is dead. Target product catalog = **exam packs** `com.lexitap.exam.{toefl,ielts,gre,gmat,business}` ($9.99, grant `exam_{name}`) + **All-Exams bundle** `com.lexitap.bundle.full` ($29.99, grants `all_exams`) + upgrade SKUs `bundle.upgrade1/2`; free categories (Foundation, Advanced, Most Common 3000/9000) carry **no product**. Keep "content category" (many-to-many tag) separate from "store product". Spec: [REVENUE_MODEL_PRICING.md](../lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md). **Do first or you configure stores wrong.** *Pairs with the schema → `word_tiers` many-to-many migration.*

### RevenueCat (B2C)

- **R1 · Store products + agreements** — M (calendar-L). Apple **Paid Apps agreement** + banking/tax (the #1 silent blocker), Google merchant profile; 3 SKUs in both consoles; one subscription group (monthly+annual) with the **intro offer** ($19.99/yr) on annual. *Per D2: intro price, not free trial.*
- **R2 · RevenueCat dashboard** — S. iOS+Android apps, products imported, `premium` entitlement (monthly+annual) + `common3k` entitlement, one Offering. Record public SDK keys.
- **R3 · Install `react-native-purchases` + plugin** — M. Keys via `EXPO_PUBLIC_*`; `Purchases.configure()` once at start; `getOfferings()` returns the offering on a real device. *Deps:* A0, R2.
- **R4 · `RevenueCatIapService` (implements existing `IapService` port)** — M. Map offerings→`getProducts`, `purchasePackage`→`purchase` (incl. `pending` Ask-to-Buy, `cancelled`), `restorePurchases`; `validateReceipt` delegated to RevenueCat `CustomerInfo` (the old `validate_receipt` Edge Function is **superseded** per API_CONTRACT — Paywall.md is stale). Container swaps Stub→RevenueCat; keep Stub for jest. **Port gap:** the interface can't *read current entitlements* — add `getActiveEntitlements()`/`getCustomerInfo()`. *Deps:* R3.
- **R5 · Entitlement-check use-case** — M. New `CheckTierAccessUseCase.canAccessTier(tierId)` from (a) free flag, (b) `premium` entitlement, (c) `common3k`, (d) B2B seat flag. **Entitlement state memory-only, never written to `user.db`** (SECURITY_MODEL invariant) — except the B2B seat flag. Unit-tested with a fake IapService. *Deps:* R4, A1.
- **R6 · Paywall wiring** — L. `paywall.tsx` is a placeholder; spec `Paywall.md`. **REVISED 2026-05-31: one-time products, no subscription** — exam packs ($9.99) + All-Exams bundle ($29.99) + gated upgrade SKUs (`bundle.upgrade1/2`, priced `$29.99 − paid`). Live products via the application layer (presentation must not import infrastructure); Restore, always-dismissible, no dark patterns; success/pending/cancel/offline states; standalone bottom-sheet from Progress/Settings; exam-pack entry from the relevant pack's locked content. **Zero off-store steering.** *Deps:* R4, R5.
- **R7 · Tier gating in learn/progress** — M. Locked tiers visually locked → tap opens paywall; `StartQuizUseCase`/selection refuse locked tiers; Settings "Unlock content" + "Restore purchases". *Deps:* R5, R6.

### Auth (same phase as IAP)

- **AU1 · Supabase Auth schema + RLS + providers** — M. `user_accounts` (id=`auth.uid()`, email, display_name, timezone) + `own_account` RLS + signup trigger; Google OAuth client IDs (iOS/Android/web) + Apple service/key in Supabase. *Per D3: magic-link, not password — SECURITY_MODEL line is stale.*
- **AU2 · Auth adapter + session persistence** — L. New `SupabaseAuthService` wrapping `signInWithOtp` (magic-link deep-link via the `lexitap` scheme), Google native ID-token, Apple Sign-In; session persists via the AsyncStorage adapter already in `supabaseClient.ts`; unrecoverable failure → silent offline; after sign-in `Purchases.logIn(user.id)`. *Deps:* A0, AU1, R3. *Risk:* magic-link deep-link in a dev client is fiddly (expo-router + expo-linking).
- **AU3 · Sign-in / Account screen (skippable)** — M. Apple/Google/Email-magic-link + "Skip for now"; reachable from Settings + onboarding; signed-in shows identity + sign-out; **on iOS, Apple button present whenever Google is** (4.8). *Deps:* AU2.

### Encrypted backup

- **BK1 · Backup upload** — L. New `BackupService` reads `user.db`, uploads to `user_db_backups/{userId}/user.db` (`upsert:true`), on background + sign-in; throws `SyncError`, never crashes. *Deps:* AU2 (**why backup can't precede auth**) + Storage bucket/RLS. *D4 RESOLVED 2026-05-30:* **rely on Storage server-side-encryption-at-rest + RLS path-scoping; no client-side AES** (docs SECURITY_MODEL/API_CONTRACT/SYSTEM_ARCHITECTURE aligned).
- **BK2 · Restore / device-switch** — L. Fresh signed-in install with no local DB downloads + initializes from the blob; no backup → empty schema + onboarding; device authoritative (blob replaces, no merge). *Risk:* **hydration must complete before `openDatabase()` runs migrations** or you migrate an empty DB then clobber it — insert a hydration gate ahead of the current open-first flow. *Deps:* BK1, AU2.

### B2B

- **B2B1 · Seat-token activation** — L. Settings redemption field labeled **verbatim** per APP_STORE_DISTRIBUTION_STRATEGY:83; code validated by a Supabase Edge Function (service-role, server-authoritative — client cannot self-grant); success writes a local entitlement flag to `user.db` (the **one** allowed entitlement there) feeding `CheckTierAccessUseCase`; **zero off-store steering.** *Deps:* AU2, R5 + Supabase seat tables/function. *Risk:* highest App-Review risk (3.1.3(c)); ship review notes verbatim; **do not** put a Stripe B2B checkout in the app. **Per D7: verify this code wasn't deleted 2026-05-28 and orphaned.**

### Cross-cutting

- Expo Go is a hard wall (A0). `tiers.ts` encodes the dead model (A1). Three doc contradictions to resolve as doc-bugs, not features (D2/D3/D4). `IapService` port can't read entitlements (R4). Container hydration ordering (BK2). The roadmap's "auth in P5" is wrong and the docs know it.

---

## E. Instrumentation, Beta Distribution & Quality Gates

### Conflicts in the roadmap (read first)

- **"Test cloud sync via device switch" / "free cloud sync" in P2 — sync was deleted, deferred to P3+.** Cannot run in P2. **Strike it; move to a P3 acceptance test** gated on backup landing. Fix the P1 deliverable line "free cloud sync" → "free Foundation tier."
- **"Phase 2 = no coding" is false.** The D7 gate is unmeasurable without analytics + an off-device `event_log` flush + Sentry — all coding. **Relabel P2 "instrumentation + beta" and pull analytics/Sentry into the tail of P1.**
- **Auth is P3, so `account_created` can't fire in P2 and there's no server identity. Retention cohorts MUST be keyed on the device `anon_id`** — a reinstall = new cohort member. Document it.
- ✅ **`ANALYTICS_PLAN.md` retention "Open Question" (in-tool vs SQL rollup) — RESOLVED 2026-05-31 → PostHog** (allowed in prod, conditioned; see Track A callout). The >30% gate's owner/query is PostHog Retention (A7); the Supabase-rollup fallback is kept documented but not the prod path.
- **`ERROR_MONITORING_PLAN.md` lists `sync` errors as P0** — sync doesn't exist. Drop the `sync` tag now; re-add P3.

Verified: `event_log` is local, append-only, INSERT-only, written synchronously in the answer transaction. Only `answer_recorded` exists. **No analytics SDK, no flush, no Sentry.** AGENTS.md is right that `event_log` is the local source-of-truth to flush, not the analytics sink.

### Track A — Analytics (before beta)

> ✅ **POLICY RESOLVED 2026-05-31 — PostHog allowed in production.** The
> CLAUDE.md-vs-this-plan contradiction (flat analytics ban vs A7's prod retention
> gate) is settled: PostHog **may run in prod**, env-gated + `anon_id`-only + no
> PII + autocapture-off + EU-host + in-Settings opt-out + privacy-policy
> disclosure, **purpose-limited to app improvement** (retention/conversion/funnel)
> — never ads, cross-app tracking, or selling data. So A7's D7 gate stands on
> PostHog (no Supabase-rollup detour needed). CLAUDE.md Forbidden-Patterns row +
> `.env.example` + privacy policy §2/§5 aligned; see
> [../memory/2026-05-31_analytics_posthog_policy.md](../memory/2026-05-31_analytics_posthog_policy.md).
> **Two hard pre-EU-beta gates remain:** (1) the A6 opt-out toggle must exist; (2)
> the shipped adapter currently uses the **US** PostHog host — must move to **EU**
> (A3) before any EU tester.

- **A1 · `AnalyticsPort` + emit seam** — S. Pure-TS `AnalyticsPort` (`capture`/`identifyAnon`/`optOut`/`flush`) + `NoopAnalytics`; use cases emit, domain stays pure. *Touches:* `domain/analytics/AnalyticsPort.ts`, `container.ts`, quiz use cases.
- **A2 · `anon_id` + `session_id`** — S. Device-scoped UUIDv4 `anon_id` once on first launch (never email/Supabase id); per-session `session_id`; both in every payload. *Touches:* `infrastructure/identity/AnonId.ts`.
- **A3 · PostHog impl** — M. `posthog-react-native`, autocapture OFF, EU host (GDPR), no PII. **Resolves the open question → PostHog** (free built-in funnels/retention; don't hand-roll SQL). ⚠️ **Code drift:** the shipped `PostHogAnalyticsService` is wired but hardcodes `host: 'https://us.i.posthog.com'` (**US**) — must change to the **EU** host (`https://eu.i.posthog.com`) before any EU tester; tracked in the analytics-policy memo. *Deps:* A1, A2.
- **A4 · Offline flush `event_log` → PostHog (idempotent)** — M. Batch unsent rows on foreground/background/session-end with retry; client-generated event id prevents double-count; preserve `occurred_at`. **Schema touch:** add nullable `synced_at` (migration 003) — additive only, no payload UPDATE. *Deps:* A3.
- **A5 · Emit the planned events** — M. `session_started/completed`, `streak_incremented/broken`, `srs_backlog_reanchored`, `analytics_opt_out`, `app_opened` (first-open, days-since-install). Defer paywall/purchase to P3, `account_created` to P3-auth. *Deps:* A1, A3.
- **A6 · Opt-out toggle + consent** — S. Settings "Share anonymous usage data"; off → local log still writes, no off-device send. **Flag:** opt-out vs opt-in for EU is unresolved (ANALYTICS_PLAN + GDPR doc) — decide before EU external beta; opt-out OK for internal testers. *Deps:* A4.
- **A7 · Retention dashboard + the D7 gate** — S (config). PostHog Retention on `anon_id` (first=`app_opened`, return=`session_completed`), D1/D7/D30 cohorts; Activation funnel; crash-free from Sentry. **Gate: D7 ≥30% proceed / 20–30% fix / <20% pivot.** **Without this the P2 gate is literally unmeasurable — the keystone.** *Deps:* A3, A5 (≥1 week data).

### Track B — Crash monitoring (before external beta)

- ✅ **B1 · `@sentry/react-native` v6.10 + init** — DONE. SDK installed; `initCrashReporting()` at `_layout.tsx` module top (catches startup crashes); `Sentry.wrap` root; auto-session-tracking on (feeds crash-free rate); no tracing/replay/screenshots; env-gated by `EXPO_PUBLIC_SENTRY_DSN` (inert until set). Adapter isolated in `src/infrastructure/crash/`. Expo source-map plugin deferred to B3 (no creds yet). *Offline disk cache = SDK default; device-verify pending.*
- ◐ **B2 · `beforeSend` PII scrub + breadcrumbs** — SCRUB DONE; tags pending. Done: strip user id/email/ip/server-name + redact email/JWT/bearer in messages; drop `http`/`xhr`/`fetch`/`sync` breadcrumbs; drop console data; fail-closed; unit-tested (`scrub.test.ts`). Pending: enrichment tags `anon_id`/`session_id`/release/free-paid/locale/online — `getOrCreateAnonId` exists, but wiring requires whitelisting a pseudonymous id through the scrub (which currently deletes all `event.user`). *Deps:* B1 ✅, A2.
- ☐ **B3 · Source maps + release health + alerts** — NOT STARTED. Blocked on a real Sentry org/project + `SENTRY_AUTH_TOKEN` EAS secret. To activate: set `SENTRY_ORG`/`SENTRY_PROJECT` (eas.json env) + token (EAS secret) → add the `@sentry/react-native` Expo plugin to `app.config.ts` `plugins` (conditional on those env vars). *Deps:* B1 ✅, eas.json (build-infra #4), Sentry token in EAS secrets.

### Track C — Beta distribution

- **C1 · Apple + Google accounts** — S+wait. (= build-infra #8/#9.) Start day one.
- **C2 · `eas.json` + signing + profiles** — M. (= build-infra #4/#10/#11.) **Does not exist; blocks B3 + all beta channels — the long pole of Track C.** EAS secrets hold PostHog key, Sentry DSN + token.
- **C3 · TestFlight internal + external** — M. Internal instant; **external needs Beta App Review (~1–2 days) — schedule it.** *Deps:* C2 + an **instrumented** build (A3–A5 + B1–B2).
- **C4 · Play Internal + Closed** — M. Data-safety form = "Tracking: No / pseudonymous analytics." *Deps:* C2, instrumented build.
- **C5 · Recruit 50 testers + 2 schools** — M ongoing. r/TOEFL, r/IELTS, APAC ESL + 2 pilots; install/test/report brief. **Recruit 60–70 to net ≥50 active** (attrition); want active cohort ≥30 to read a stable D7. *Deps:* C3/C4 live, A7 ready.

### Track D — QA

- **D1 · Manual QA matrix** — M first / S per build. Home→Quiz→Progress→Settings, full onboarding (steps 2/3/5/6 test they don't crash), settings + analytics opt-out, **offline** (quiz airplane-moded; events queue + flush), **a low-end Android** (2–3GB RAM) for ATTACH + cold-start. Green on both before each beta build.
- **D2 · One Maestro smoke (recommended) or accept manual-only** — S. One YAML (launch → onboarding → one quiz answer → Progress) on Maestro Cloud catches the white-screen/migration-crash class between builds. Detox not worth it. Else a one-line ADR "manual-only, D1 gates every build."
- **D3 · Verify words.db bundles (= C0/BUILD-2)** — S. Confirm the `.ipa`/`.aab` ships the DB and ATTACH succeeds on a clean install on the low-end Android. **If broken, every beta build is dead on arrival.**

### Mandatory ordering

A beta with no instrumentation forfeits the whole phase. **D3 → (A1→A2→A3→A4→A5, B1→B2 in parallel) → A7 → C1/C2 → B3 → C3/C4 (instrumented build only) → D1+D2 → C5 → run window → read A7.** Long poles: Apple Beta App Review, Apple enrollment, eas.json+signing — start C1/C2 immediately, parallel to analytics coding.

---

## F. Store Submission, Legal/Compliance & Go-To-Market

**Current reality: nothing built.** No `eas.json`, no icon/splash (`assets/` has only `vocab/`), no account-deletion/export/age-gate code. The docs are good target specs; this is from zero.

### Flags first

- **SIWA timing conflict.** Docs say SIWA P3; verified state says auth unwired/P5. **iOS submission cannot start until auth delivers Google + SIWA** — the largest cross-domain dependency. Apple 4.8: Google Sign-In present → SIWA mandatory.
- **COPPA is a cheap-to-neutralize trap, not a non-issue.** Adult audience avoids "Made for Kids," but a global audience means minors will try to sign up. **16+ neutral DOB gate + delete-on-discovery; no parental-consent path** (that path *is* the trap). ~S task (D5).
- **B2B web portal not realistic solo → manual invoice.** A live B2C checkout on the site is an App Review risk (3.1.1) and weeks of PCI/tax work. Static site + "contact sales, min 10 seats" + manual Supabase provisioning (D6).
- **Kill the "Cloud Sync" screenshot/claim** (strategy doc Screen 3) — sync was deleted; advertising it is a rejectable marketing/behavior mismatch and pollutes the Data Safety form. Replace with offline messaging.
- **Screenshots must show NO TextInput** — and can only feature MultipleChoice + DragDrop (the other widgets are skeletons). Don't design store art around widgets that don't exist. Also: don't screenshot Home while it shows `0` (H-1 first).
- **Config mismatch:** runbook assumes `app.config.ts`; repo has static `app.json`. Migrate before EAS-secret/RevenueCat key injection.

### Tasks

- **LEGAL-1 · Age-gate + COPPA decision** — S. Lock 16+ global, neutral DOB, no parental consent, delete-on-discovery. (= D5.) *Touches:* GDPR doc.
- **LEGAL-2 · Privacy policy + ToS finalized + hosted** — M (counsel turnaround). Fill template, **get a paid counsel review** (the one place to spend money), publish at `lexitap.app/privacy` + `/terms`. *Deps:* LEGAL-1, WEB-1.
- **LEGAL-3 · Sub-processor DPAs + data region** — S. Supabase DPA + region (pick **EU** unless latency forces US) + SCCs; Sentry DPA with PII scrub; **PostHog DPA + EU host** (pseudonymous `anon_id` analytics). *Deps:* none.
- **ACCT-1 · Developer accounts** — S+wait. Apple ($99, + Small Business Program 30%→15%), Google ($25), Expo, RevenueCat. **Start immediately** (enrollment latency).
- **BUILD-1 · `app.json` → `app.config.ts` + `eas.json`** — M. Env injection via `extra`; profiles + `ascAppId`/`appleTeamId`/Android SA; `expo-doctor` clean. *Deps:* ACCT-1.
- **BUILD-2 · words.db bundling verification** — M (= C0). Release blocker — a store build shipping an empty word list is dead on arrival. *Deps:* BUILD-1.
- **LEGAL-4 · Account deletion + data export + age gate (CODE)** — L. Settings "Delete account" (**Apple-mandated once accounts exist, 5.1.1(v)** — cascades Supabase + clears device, irreversible), "Export my data" (JSON), neutral DOB 16+ block. *Deps:* auth domain (accounts must exist), LEGAL-1. **Highest-coupling legal item — blocked on unwired auth.**
- **ASSET-1 · Icon + splash + store icons** — M. 1024² iOS (no alpha/rounding), Android adaptive, 512² Play, splash. None exist. *Deps:* none.
- **ASSET-2 · Screenshots** — M. 6 × iPhone 6.9" (1320×2868) showing no-typing recognition (MC + DragDrop only), SRS, TOEFL/IELTS, Premium "cancel anytime," Knowledge Map; **Screen 3 = offline messaging, not sync**; Android feature graphic 1024×500. *Deps:* BUILD-2, H-1 (no `0` progress).
- **ASO-1 · Listing copy + metadata** — M. iOS name "LexiTap: TOEFL & IELTS Vocab", subtitle "Offline vocabulary review. No typing.", 100-char keywords, 4000-char desc; Android short(80)+full; category; age rating general/teen (NOT Kids); English-only at launch. *Deps:* none.
- **LEGAL-5 · Privacy nutrition labels + Data Safety** — S. Both forms per GDPR doc map, Tracking=No, **match each other and runtime SDK behavior**, do NOT declare sync. Privacy URL entered. *Deps:* LEGAL-2/3 + final SDK list.
- **REVCAT-1 · Store IAP products + RevenueCat wiring** — L. 3 SKUs in ASC+Play, `premium` entitlement + `default` offering, keys as EAS secrets, paywall lists terms/price/auto-renewal + ToS/Privacy per 3.1.2. (Cross-domain with §D.) *Deps:* ACCT-1.
- **WEB-1 · lexitap.app static site + B2B sales-contact** — M. Hosts privacy/terms; B2B = contact form only, **no B2C checkout / price list / steering** (Apple reviews the site). Manual invoice. *Deps:* LEGAL-1/2.
- **REVIEW-1 · App Review battle plan (3.1.3(c))** — M. 2 pre-provisioned seat tokens + 1 teacher demo + private video (student enters token → unlocks TOEFL offline) + verbatim 3.1.3(c) notes + exact redemption-field copy. **Risk HIGH — depends on B2B1 existing; if seat redemption was deleted (D7), the institutional story is vapor — rebuild or drop B2B.** *Deps:* B2B1, LEGAL-2, REVCAT-1.
- **SUBMIT-1 · TestFlight + Play Internal** — M. Production build both platforms; founder + cohort install + run offline; `expo-doctor` clean. *Deps:* BUILD-1/2, ASSET-1/2, REVCAT-1, LEGAL-4, **auth+SIWA shipped.**
- **SUBMIT-2 · iOS App Store** — S to submit, **1–2wk review buffer.** Pre-empt the six rejection causes: 3.1.3(c) (REVIEW-1), missing SIWA (AU3), paywall terms (REVCAT-1), privacy/behavior mismatch (kill sync claims), account deletion (LEGAL-4), website B2C undercut (WEB-1). *Deps:* all above + SIWA + REVIEW-1.
- **SUBMIT-3 · Google Play** — S. Internal→Closed→Open→Production; content rating Everyone; Data Safety matching iOS; target API meets minimum. (Play review faster; Apple is the schedule driver.) *Deps:* SUBMIT-1, LEGAL-5.
- **GTM-1 · Launch GTM (P6)** — ongoing. Reddit (value-first), ASO tracking + OTA-safe listing edits, teacher referral = store-approved trial only, monthly content drops as **store builds** (they add IAP products — not OTA). *Deps:* SUBMIT-2/3 live.

**Sequencing:** ACCT-1 + LEGAL-1/2/3 + ASSET-1 + ASO-1 start in parallel immediately. BUILD-1→2 unblock builds. **The critical path runs through the auth domain** (LEGAL-4 + SIWA block iOS submission). REVIEW-1 depends on a seat-redemption path that may have been deleted — **verify (D7) before promising B2B.** If auth or seat-redemption slip, descope to pure-B2C iOS launch + fast-follow institutional tokens rather than holding the whole release.
