---
name: next_steps_2026_06
description: Immediate next steps for June 2026 — blockers to clear before launch
type: action_plan
---

# Next Steps for June 2026

**Updated:** 2026-05-31 23:59
**Phase:** Critical path to launch (C0–C5 complete)
**Owner:** Ryan Gonzalez + spawn agents as needed

---

## Week 1: Critical Path Execution

### Task 1: C5 QA Sample Gate (IMMEDIATE)

**What:** Run sampled integrity checks on restored content database.

**Action:**
1. `cd content-tool && npm run release -- --validate`
   - Verify row counts: 2,881 words, 2,894 word-tier memberships
   - Verify 9 tiers exist with correct SKU metadata
   - Verify audio file references resolve (if audio bundled)
2. Check `src/commands/review.ts` test output for status column + reviewed flag
3. Log results to `memory/2026-06-01_c5_qa_sample.md`

**Expected outcome:** ✓ All rows pass integrity checks
**Blocker if:** Row counts mismatch or schema corruption detected
**Time:** ~1 hr
**Effort:** Low

---

### Task 2: Build Fresh EAS Release (IMMEDIATE)

**What:** Create new EAS build from current master (fixes dual-React, ATTACH path, Metro subpath).

**Action:**
1. Verify metro.config.js has React + PostHog redirects (commit `6668a6d`, `3432117`)
2. Verify app.config.ts version bumped if needed (currently `0.1.0`)
3. Run `eas build --platform ios --profile preview`
4. Capture build ID + log to session notes
5. Monitor build for Metro warnings (should see 0 errors)

**Expected outcome:** ✓ Build succeeds, no errors, app-center receipt confirmed
**Blocker if:** Metro subpath fails or dual-React mismatch surfaces
**Time:** ~30 mins (EAS handles 10–15 min build time)
**Effort:** Low

---

### Task 3: C0 Physical Device Test (CRITICAL)

**What:** Prove cold-launch on real iPhone (UDID + provisioning).

**Action:**
1. Obtain provisioned iPhone UDID (must be registered in App Store Connect)
2. Download fresh EAS build from Task 2 to device
3. Launch app cold (kill from bg, relaunch)
4. Verify:
   - App launches without crash
   - `words.db` ATTACH succeeds (check Sentry for errors)
   - Quiz screen shows ≥43 words loaded (verify via QA screenshot)
   - Diagnostic sampler works (run stride sampler)
   - Paywall displays (check SKU grid)
5. Screenshot full flow: cold launch → onboarding → paywall
6. Log results + any crashes to session notes

**Expected outcome:** ✓ Cold launch succeeds, ≥43 words queried, paywall renders
**Blocker if:** Crash on launch, ATTACH fails, or DB corruption detected
**Time:** ~2 hrs (includes device setup + testing)
**Risk:** Medium (Metro/DB fixes may surface device-only issues)
**Next:** If ✓ pass → proceed to C4. If ✗ fail → debug + rebuild.

---

### ~~Task 4: C4 Enrichment Completion~~ ✅ DONE

**Completed:** commit `0cc4d45` — DeepSeek-chat enriched 2,790 stubs (3 passes) + 10 manual fixes. 2,881 words / 0 TBD stubs. `validate --strict` clean.

---

### ~~Task 5: C5 Full Validation Run~~ ✅ DONE

**Completed:** commit `0cc4d45` — `validate --strict` clean (0 errors, 2,802 known warnings). `words.db` (1.18 MB) copied to `mobile/assets/vocab/`. 41 test suites / 381 tests green.

---

## Week 1-2: Parallel Track — P-2 Beta Recruitment

**What:** Start gathering 50–500 learners for closed beta (Sept launch).

**Reference:** `plans/P2_RECRUITMENT_CHECKLIST.md` (detailed channels, consent flow, onboarding)

**Quick checklist:**
- [ ] Define beta cohort (target: 100 learners, mix of CEFR levels)
- [ ] Prepare recruitment channels (Twitter, Reddit r/learnEnglish, ESL Facebook groups, Product Hunt)
- [ ] Draft recruitment copy + beta terms (mention: "paid exam packs coming Sept", anonymous beta feedback)
- [ ] Set up beta feedback form (Google Form or Typeform)
- [ ] Prepare onboarding email sequence (6 emails: welcome, how to report bugs, feature request, mid-beta pulse, beta exit survey, launch announcement)
- [ ] Assign beta tester leads for Discord/Slack community (if applicable)

**Time:** Starts week 1, runs through Sept (parallel to dev work)
**Owner:** Ryan + potential recruiter/marketing contractor

---

## Week 2: Device Validation & Debt Cleanup

### Task 6: Android Device Test (OPTIONAL — post-launch OK)

**What:** Prove cold-launch on physical Android device (APK from EAS build).

**Action:**
1. Build Android APK: `eas build --platform android --profile preview`
2. Transfer APK to Android test device (USB or ADB)
3. Repeat C0 test sequence (cold launch → onboarding → paywall)
4. Verify no device-specific regressions (e.g., font rendering, touch targets)

**Expected outcome:** ✓ Android cold launch succeeds (defer full validation to post-launch if tight on timeline)
**Time:** ~2 hrs
**Risk:** Low (iOS gate is primary; Android usually follows)

---

### Task 7: Nativewind Debt Assessment (DOCUMENTATION ONLY)

**What:** Document nativewind upgrade blockers + recommend path forward.

**Action:**
1. Audit `package.json` nested dependencies (nativewind → react-native@0.85, reanimated@4)
2. Check if NativeWind 5.x supports react-native@0.76 (current root)
3. Create `memory/2026-06-XX_nativewind_upgrade_plan.md` with:
   - Current state (4.2.4 + patches)
   - Target state (5.x or later)
   - Risk assessment (API changes, peer deps)
   - Effort estimate (days, test complexity)
4. Recommend: either upgrade as post-launch Phase 2 task or flag for next device validation cycle

**Expected outcome:** ✓ Plan documented, effort estimated
**Time:** ~1 hr (research only)
**Effort:** Low

---

## Launch Readiness Checklist

```
PHASE 1 VALIDATION:
  ✓ Unit tests green (272 mobile + 94 content-tool)
  ✓ Accessibility audit (WCAG AA)
  ✓ Onboarding complete (O-1→O-5)
  ✓ Paywall scaffold (R1 integration pending Phase 3)
  ✓ Age gate + legal (COPPA + privacy policy)
  ✓ Analytics + crash (env-gated, PII scrubbed)
  ✓ Build infra locked (EAS profiles, Apple Team ID)

CRITICAL PATH (C0–C5):
  ⏳ NEW EAS build (week 1) — still pending
  ⏳ C0 device test (week 1) — still pending (physical iOS + Android)
  ✓ C4 enrichment completion — DONE (commit 0cc4d45)
  ✓ C5 validation run — DONE (0 errors, words.db in bundle)

LAUNCH GATE:
  ⏳ P-2 beta recruitment starts (week 1–2)
  ⏳ Store submission prep (App Store Connect + Google Play Console)
  ⏳ Code review pass (no security/privacy violations)
  ⏳ Beta TOS + privacy policy finalized + posted

NOT ON CRITICAL PATH:
  ⏸ R1 RevenueCat integration (Phase 3)
  ⏸ DIAG-A pseudo-word frontier (Phase 3)
  ⏸ A7 PostHog EU host bug fix (post-launch)
  ⏸ Nativewind SDK upgrade (separate validation cycle)
```

---

## Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **C0 device crash** | Medium | Critical (launch blocker) | Fresh EAS build + Metro fixes | Debug tree + device logs |
| **C4 enrichment cost overrun** | Low | Minor (budget overage) | Use Haiku (cheaper) | Monitor token usage |
| **C5 schema mismatch** | Low | Critical (data loss) | Test before rebuild | Run `npm run check` after rebuild |
| **Metro dual-React re-surfaces** | Low | Critical (black screen) | Shim in metro.config | Device regression test |
| **App Store review delay** | Medium | Major (launch slip) | Submit 4–6 weeks early | Parallel to beta launch |

---

## Success Criteria

**By end of week 1:**
- ✓ EAS build succeeds (no warnings)
- ✓ C0 device test passes (cold launch + 43+ words + paywall)
- ✓ C4 enrichment completes (2,848+ words, <$1 cost)
- ✓ C5 validation green (155 tests + schema integrity)
- ✓ 10+ beta recruits signed up (first cohort)

**By end of week 2:**
- ✓ Android device test passes (deferrable if tight)
- ✓ Nativewind debt plan documented
- ✓ 50+ beta recruits confirmed
- ✓ Store submission checklist 90% complete (app icons, pricing, desc)

---

## Session Continuation Notes

- **Current master branch status:** All Phase 1 work merged. Ready for C0–C5 tasks.
- **Test baseline:** 381 tests green (41 suites).
- **Config locked:** app.config.ts, eas.json, metro.config.js, .env.example all in repo.
- **Decision lock:** D1–D8 all committed. No scope change without documented ADR.
- **Memory:** 14 dated session notes + this plan. MEMORY.md auto-loads into CLAUDE.md.

**For next session:** Start with Task 1 (C5 sample). Reference `2026-05-31_mega_sprint_final.md` if context needed.

---

**Plan authored by:** Ryan Gonzalez (summary of mega-sprint follow-up)
**Last updated:** 2026-05-31 23:59
**Next review:** 2026-06-07 (end of week 1)
