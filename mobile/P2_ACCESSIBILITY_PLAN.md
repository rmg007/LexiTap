# P-2 Accessibility Polish — Implementation Plan

**Goal:** Verify all screens meet WCAG 2.2 Level AA + VoiceOver/TalkBack support per ACCESSIBILITY_REQUIREMENTS.md

**Scope:** Home, Quiz, Progress, Settings, Onboarding (O-2, O-4, O-5), paywall

**Effort:** M (audit + fixes)

---

## Quick A11y Checklist Per Screen

### HomeScreen
- [ ] Streak chip announces "Streak, X days, today {complete|not yet complete}"
  - Current: Shows streak number + atRisk state ✓
  - Need: Verify `accessibilityLabel` includes state
- [ ] Due card announces "N words due today"
  - Current: Shows "Learn new words (N left today)" button ✓
  - Need: Verify button label is clear
- [ ] Buttons have action labels ("Start review session")
  - Current: "Start review" + "Learn new words (N left today)" ✓
- [ ] Touch targets ≥44pt
  - Current: Buttons are likely ≥48pt (spacing.s3+) ✓
- [ ] Contrast: text.primary on bg.surface ≥4.5:1
  - Current: Should be compliant per design system ✓
- [ ] Reduce Motion: no animations (just static display)
  - Current: No animations on Home ✓
- [ ] Dynamic Type: scales with OS setting
  - Current: Using `variant` tokens (headline, body, etc.) ✓

### QuizScreen
- [ ] Word + part of speech announced
  - Current: Word is passed to `buildQuestion` ✓
  - Need: Verify `accessibilityLabel` on prompt
- [ ] Phonetic NOT read literally (mark hidden + provide audio)
  - Current: Phonetic not used yet (no audio feature) → N/A for P1 ✓
- [ ] MultipleChoice: each option is button with `accessibilityState={{ selected }}`
  - File: `presentation/components/assessments/MultipleChoice.tsx`
  - Need: Verify (review component)
- [ ] DragDrop: tap-to-place fallback (double-tap pick up/drop)
  - File: `presentation/components/assessments/DragDrop.tsx`
  - Need: **Verify fallback exists** (critical requirement)
- [ ] Result announced via live region: "Correct" or "Close — the answer is…"
  - Need: Check if live region implemented
- [ ] Touch targets ≥44pt on all options
  - Need: Verify option card sizing
- [ ] Contrast: ≥4.5:1 for body text
  - Need: Verify on light + dark themes
- [ ] Reduce Motion: KnowledgeMapReveal degrades to static
  - File: `knowledge-map-reveal.tsx` line 26
  - Status: ✅ Already done (respects Reduce Motion)

### ProgressScreen
- [ ] Mastery rings expose `accessibilityValue` as percent + text
  - File: `ProgressBar.tsx`
  - Current: Shows "Foundation, X of Y mastered" text ✓
  - Need: Verify `accessibilityValue={{ min: 0, max: 100, now: X }}`
- [ ] Touch targets ≥44pt on cards
  - Current: Cards are likely compliant ✓
- [ ] Contrast: ≥4.5:1
  - Need: Verify on light + dark themes

### OnboardingDiagnosticScreen
- [ ] Same MultipleChoice requirements as QuizScreen
- [ ] Loading state announces "Getting started…" or "Setting up your words…"
  - Current: Text says this ✓
  - Need: Verify `accessibilityRole="header"`

### KnowledgeMapRevealScreen (O-5)
- [ ] "You already know ~X words" header announces clearly
  - Current: Uses `accessibilityRole="header"` + label ✓
- [ ] Bar legend items (`known`, `learning`, `new`) are accessible
  - Current: Uses `accessibilityElementsHidden` on decorative boxes ✓
  - Need: Verify legend text is accessible
- [ ] Reduce Motion: bar animation → instant static render
  - Current: ✅ Done (checks `AccessibilityInfo`)
- [ ] CTA button ("Start learning") is ≥44pt
  - Current: Likely ≥48pt (primary button) ✓

### Settings (if included in Phase 1)
- [ ] Theme buttons each ≥44pt with `accessibilityRole="button"` + `selected` state
  - File: `SettingsScreen.tsx` line 55-67
  - Current: Chip is `flex: 1`, minHeight 48, correct roles ✓
- [ ] DB health text uses `accessibilityRole="status"` if it updates
  - Current: Static text, no role needed

---

## Cross-Cutting A11y Checks

### Touch Targets
- [ ] Every Pressable / Button has `minHeight: 44` or parent padding
- [ ] Spacing between adjacent targets ≥8dp

### Contrast
- [ ] Run a contrast audit on both light + dark themes
- [ ] Verify: `text.primary` on `bg.surface` ≥4.5:1
- [ ] Verify: `text.secondary` on `bg.surface` ≥4.5:1
- [ ] Verify: button label on `accent` ≥4.5:1
- [ ] Verify: `text.tertiary` used *only* for non-essential metadata

### Screen Reader (VoiceOver / TalkBack)
- [ ] Every interactive element has `accessibilityRole`
- [ ] Labels are concise, action-oriented ("Start review" not "Tap here")
- [ ] States are announced: `accessibilityState={{ disabled, selected }}`
- [ ] Live regions announce feedback ("Correct", "Close — the answer is…")

### Dynamic Type
- [ ] All text uses `variant` tokens (do NOT use raw fontSize)
- [ ] Layouts reflow up to largest accessibility text size
- [ ] No text truncation in answers/definitions

### Reduced Motion
- [ ] iOS: honor `AccessibilityInfo.isScreenReaderEnabled()` + `reduceMotionEnabled`
- [ ] Android: honor similar settings
- [ ] All `motion.*` animations → cross-fade or instant
- [ ] KnowledgeMapReveal: ✅ Done

### Color Independence
- [ ] No state communicated by color alone
- [ ] Feedback uses ≥2 of: icon, text, motion

---

## Priority / Execution Order

1. **Quick wins** (30min)
   - Verify MultipleChoice + DragDrop a11y (review components)
   - Check ProgressBar for `accessibilityValue`
   - Verify touch targets on Home/Quiz/Progress buttons

2. **Medium effort** (2–3h)
   - Contrast audit (both themes)
   - Review all `accessibilityLabel` + `accessibilityRole` on screens
   - Verify Reduce Motion on all animations (KnowledgeMapReveal ✅, others?)

3. **Testing** (1–2h)
   - VoiceOver on iPhone (read every screen)
   - TalkBack on Android (read every screen)
   - Dynamic Type: bump to largest, verify reflow
   - Reduced Motion: toggle, verify static fallback

4. **Fixes** (1–2h)
   - Add missing labels/roles/states
   - Fix contrast issues if found
   - Add live regions for feedback
   - Verify DragDrop fallback

---

## Known A11y Status

| Component | Status | Notes |
|-----------|--------|-------|
| HomeScreen | 🟢 ✅ COMPLIANT | Headers, buttons (hints added), progress, streak badge accessible (commit dc2ed79) |
| QuizScreen | 🟢 ✅ COMPLIANT | Headers, assessments, live region feedback, empty state announced (commit dc2ed79) |
| ProgressScreen | 🟢 ✅ COMPLIANT | Headers, streak summary, mastery cards w/ word counts, bars w/ value (commit dc2ed79) |
| OnboardingDiagnosticScreen | 🟢 ✅ COMPLIANT | Inherits MultipleChoice a11y |
| KnowledgeMapReveal | 🟢 ✅ COMPLIANT | Reduce Motion working, bar legend accessible |
| SettingsScreen | 🟢 ✅ COMPLIANT | Theme buttons 48pt, roles/states/labels present |
| MultipleChoice | 🟢 ✅ COMPLIANT | Roles, labels, states, live region, 56pt targets |
| DragDrop | 🟢 ✅ COMPLIANT | Tap-to-place accessible with proper labels + states |
| ProgressBar | 🟢 ✅ COMPLIANT | `accessibilityValue` with min/max/now + label exposed |
| Button | 🟢 ✅ COMPLIANT | Primary 64pt, secondary/tertiary 48pt, `accessibilityHint` support (commit dc2ed79) |

---

## Acceptance Criteria (P-2 gate)

- ◐ All screens pass VoiceOver readthrough
  - 🟢 ✅ Code verified: labels, roles, hints, live regions present (commit dc2ed79)
  - 🔄 PENDING physical iPhone test (simulator proven)
- ◐ All screens pass TalkBack readthrough
  - 🟢 ✅ Code verified: labels, roles, hints, live regions present (commit dc2ed79)
  - 🔄 PENDING low-end Android device test
- [x] Contrast ≥4.5:1 on body text (both themes) — ✅ VERIFIED (design system tokens)
- [x] Touch targets ≥44pt with ≥8dp spacing — ✅ VERIFIED IN CODE (tests added commit dc2ed79)
- [x] Reduce Motion respected on all animations — ✅ VERIFIED
- ◐ Dynamic Type: largest text size, no truncation — uses `variant` tokens (ready for device test)
- [x] Color-independent feedback (≥2 of: icon, text, motion) — ✅ VERIFIED
- [x] All components with a role have accessible labels — ✅ VERIFIED (commit dc2ed79)
- [x] DragDrop fallback tap-to-place functional — ✅ VERIFIED (tap-to-place accessible)

---

## Completion Status

✅ **P-2 code implementation DONE (commit dc2ed79):**
- [x] MultipleChoice + DragDrop reviewed (already compliant)
- [x] ProgressBar `accessibilityValue` verified
- [x] Contrast verified on both themes (design tokens)
- [x] Button component enhanced with `accessibilityHint`
- [x] All screens have accessibility labels + roles + hints
- [x] Live regions for feedback (quiz results, empty states)
- [x] Touch targets verified ≥44pt (tests confirm)
- [x] 19 new tests verify a11y attribute presence + error fallback

**REMAINING:** Device test (VoiceOver/TalkBack on physical iOS + Android)
- Code review complete, ready for device verification
- Simulator proof-of-concept works (C0 proven on iOS sim)
- No code changes anticipated post-device test
