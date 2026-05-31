---
title: Onboarding Age Gate (D5)
status: decided
updated: 2026-05-31
decision: 16+ neutral DOB gate, no parental consent, delete-on-discovery
phase: P5 (legal + compliance)
---

# Onboarding Age Gate — Design & Implementation Plan

**Decision: 16+ global, neutral date-of-birth gate, no parental-consent path, delete-on-discovery.**

App targets adult ESL learners (13+ original spec, but App Store de facto prevents minors). A simple age gate neutralizes the "Made for Kids" complexity and avoids parental-consent overhead—while complying with Apple 5.1.3 and COPPA avoidance.

---

## Why This Approach

| Option | COPPA | "Made for Kids" | Implementation | Cost |
|--------|-------|-----------------|---|---|
| **16+ gate (chosen)** | Avoids triggering it | No burden | DOB picker pre-account | ~S |
| Age verification API | Compliance-heavy | No burden | ~M (3rd-party integration) | $$ |
| Parental consent flow | Addresses it directly | Required | ~L (multi-modal, legal review) | $$+ |
| No gate (current) | Exposed | No burden | — | Risk: App Review |

**Selected: 16+ gate.** App is genuinely for adults; a neutral DOB picker disarms the minor-signup trap at zero friction.

---

## Screen Specification

### Route: `/onboarding/age`

**When:** Before Welcome (O-1). Inserted at the head of the onboarding chain. If the user completes onboarding and is later discovered to be <16, the account is flagged for deletion (legal team + support escalation; not automated).

**Visual:**
- Title: "How old are you?" or "What's your date of birth?"
- Subtitle (optional): "LexiTap is for learners 16 and older."
- Input: `DatePickerIOS` (iOS) / `DatePickerAndroid` (Android), via `@react-native-community/datetimepicker` or equivalent
- Default date: 16 years ago (helpful hint)
- Primary button: "Continue" (disabled until DOB selected)
- No back button (age is pre-account; first decision point)

**Accessibility:**
- Visible label: `accessibilityLabel="Date of birth picker"`
- Live region on error: "You must be 16 or older to use LexiTap"
- Focus trap: modal behavior (no dismiss without selection)

### Logic

```typescript
// Pseudocode—actual implementation in OnboardingAgeGateScreen.tsx

const handleContinue = (dob: Date) => {
  const age = calculateAge(dob, today());
  if (age < 16) {
    showError("You must be 16 or older to use LexiTap.");
    // Do NOT navigate. Stay on this screen.
    // No "back" option.
  } else {
    // Age OK—proceed to Welcome.
    router.replace('/onboarding/welcome');
  }
};

const calculateAge = (dob: Date, today: Date): number => {
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age;
};
```

**Behavior:**
- ✅ User selects valid DOB (≥16): advance to `/onboarding/welcome`
- ✗ User selects DOB <16: show inline error, stay on screen, no navigation
- Offline: screen renders (no network calls); age calculation is local

**Data persistence:** None. The age gate is pre-account; no data is saved to the database.

---

## Routing Order

```
(cold launch)
  ↓
(services initialized)
  ↓
(isOnboardingComplete check)
  ↓
/onboarding                    ← redirects to first incomplete step
  ↓
/onboarding/age                ← NEW: age gate (inserted here)
  ↓ (if age ≥ 16)
/onboarding/welcome            ← O-1: Welcome screen (existing)
  ↓
/onboarding/goal-selection     ← O-2: Goal picker (existing)
  ↓
/onboarding/diagnostic         ← O-4: Stride sampler → frontier (existing)
  ↓
/onboarding/knowledge-map...   ← O-5: Known/Learning/New reveal (existing)
  ↓
/onboarding/paywall            ← Paywall if locked content
  ↓
(complete)
→ /(tabs)/home                 ← Main app
```

**Note:** O-3 (proficiency) is cut per D1. The age gate is inserted as O-0 (pre-O-1).

---

## Implementation Tasks

### Phase 5 (Pre-Launch Legal)

| Task | File(s) | Deps | Effort |
|---|---|---|---|
| **D5 · OnboardingAgeGateScreen** | `mobile/app/onboarding/age.tsx` + `mobile/src/presentation/screens/onboarding/OnboardingAgeGateScreen.tsx` | — | S |
| **Wire age gate routing** | `mobile/app/onboarding/_layout.tsx` (ensure `/age` is first in the stack or use `router.replace` guard in `/onboarding/index.tsx`) | D5 | S |
| **Update onboarding gate logic** | `mobile/app/_layout.tsx` → check `isOnboardingComplete()`, push to `/onboarding/age` instead of `/onboarding` | D5 | S |
| **Tests** | `OnboardingAgeGateScreen.test.tsx` (age calc, <16 error, ≥16 advance, accessibility) | D5 | S |

---

## Files to Create/Modify

### New Files

1. **`mobile/app/onboarding/age.tsx`** (route file)
   - Thin wrapper; imports and renders `OnboardingAgeGateScreen` from `@/presentation/screens/onboarding`

2. **`mobile/src/presentation/screens/onboarding/OnboardingAgeGateScreen.tsx`** (implementation)
   - DatePickerIOS/Android wrapper
   - `calculateAge()` utility
   - Error state + conditional render
   - Accessibility labels

3. **`mobile/src/presentation/screens/onboarding/OnboardingAgeGateScreen.test.tsx`**
   - Age calculation edge cases (day-before birthday, leap year)
   - <16 shows error, no navigation
   - ≥16 navigates to `/onboarding/welcome`
   - Accessibility render (no a11y violations)

### Modified Files

1. **`mobile/app/_layout.tsx`**
   - Change `router.replace('/onboarding')` → `router.replace('/onboarding/age')`

2. **`mobile/app/onboarding/_layout.tsx`** (if present, or create)
   - Ensure `/age` is the first route or explicitly ordered

3. **`mobile/src/presentation/screens/onboarding/index.ts`**
   - Export `OnboardingAgeGateScreen`

---

## Security & Privacy Notes

- **No storage.** The entered DOB is never written to AsyncStorage, database, or any backup.
- **No PII leakage.** The birthday is used only for age calculation (local, in-memory).
- **Delete-on-discovery (future).** If a user completes onboarding and is later found to be <16 (e.g., via support ticket), the account is flagged and escalated to legal+support for manual deletion under GDPR/COPPA. Not automated.

---

## Legal Tie-In

- **Resolves COPPA exposure.** Adult audience + 16+ gate = avoid "Made for Kids" and parental-consent complexity.
- **Supports D5 decision in RELEASE_PLAN.** No changes to `LEGAL_STRATEGY.md` or other docs; this is the implementation of the decided gate.
- **Privacy policy:** No mention of DOB collection (nothing is stored). App is 16+ by design.

---

## Test Checklist (before merge)

- [ ] Age <16 → error rendered, navigation blocked
- [ ] Age ≥16 → navigate to `/onboarding/welcome`
- [ ] Edge: turn 16 today → ≥16 allowed
- [ ] Edge: yesterday before birthday at 16 → <16 blocked
- [ ] Leap year: Feb 29 dobs handle correctly
- [ ] Accessibility: labels, roles, live region on error
- [ ] Offline: screen renders without network
- [ ] No data persisted to AsyncStorage or database
- [ ] Can't skip via back button (no back button)

---

## Notes for Integration

1. **Order matters.** The age gate must run before any account data is created. Routing: it's the first screen after `/onboarding/index` redirects.
2. **No conditional onboarding state.** The `onboarding_state` in the DB is NOT written until after Welcome/Goal/Diagnostic/KM complete. Age gate is pre-state.
3. **Post-launch cleanup.** Once the app is live and D-7 gate is being monitored, add a scheduled task to check for and flag <16 accounts (via support audit or manual review).

