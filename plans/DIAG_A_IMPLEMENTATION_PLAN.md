---
title: DIAG-A Implementation Plan (Post-Launch)
status: implemented
priority: P1
trigger: "After Phase 1 launch, once Foundation content (C3–C8) is complete and pseudo-word library is sourced"
---

# DIAG-A: Full Adaptive Diagnostic Implementation Plan

**Locked commitment:** DIAG-B ships at launch. DIAG-A must replace it post-launch once blocking content/data dependencies are resolved.

**Specification:** `lexitap-docs/03-ux-design/ONBOARDING_FLOW_SPEC.md` (complete, detailed, locked).

---

## ✅ Implementation Status (2026-05-31)

DIAG-A is **implemented and wired as the live onboarding diagnostic** (route
`app/onboarding/diagnostic.tsx` now mounts `OnboardingAdaptiveDiagnosticScreen`).
DIAG-B (`diagnostic.ts` + `OnboardingDiagnosticScreen` + `RunDiagnosticUseCase`)
is retained as a tested fallback, not deleted.

| Phase | Item | Where | State |
|-------|------|-------|-------|
| A | `frequency_rank` column + `pseudo_words` table + indexes | `content-tool/src/schema/ddl.ts`, `lib/db.ts` migrations | ✅ |
| A | CSV parse + import + export of both | `lib/csv.ts`, `commands/import.ts` (+`import-pseudo`), `commands/export.ts` | ✅ |
| B-1/2 | `DiagnosticState` + band-walk engine (pure) | `mobile/src/domain/onboarding/adaptiveDiagnostic.ts` | ✅ 34 tests |
| B-3 | Confirm-on-Yes flow | in the screen (Yes → 3-option meaning check) | ✅ |
| B-4 | `RunAdaptiveDiagnosticUseCase` | `mobile/src/application/onboarding/` | ✅ 9 tests |
| B-5/6 | Frontier seeding + known-count (pure) | `mobile/src/domain/onboarding/frontierSeeding.ts` | ✅ 16 tests |
| C-1 | Adaptive `DiagnosticRunner` screen | `OnboardingAdaptiveDiagnosticScreen.tsx` | ✅ |
| C-2 | Knowledge Map uses real corrected frontier + pool size | `app/onboarding/knowledge-map-reveal.tsx` | ✅ |
| — | Pseudo-word repo (port + SQLite) | `domain/onboarding/PseudoWord.ts`, `infrastructure/db/repositories/SQLitePseudoWordRepository.ts` | ✅ |
| — | Bundled `words.db` rebuilt: 2790/2881 ranked, 10 pseudo-words | `mobile/assets/vocab/words.db` (user_version 2) | ✅ |

**Remaining (genuine content/tuning work, not code):**
- **91 Foundation words still lack a rank** (no match in `foundation_3000.csv`); band-walk falls back to any-unused word for those. Extend the rank source to close the gap.
- **Pseudo-word library is a 10-word placeholder** (`content-tool/data/input/pseudo_words.csv`) — needs a real curated set (50–100 vetted non-words) before relying on the false-alarm signal.
- **PC-3 resume flow** (quit/resume mid-diagnostic) is NOT built — the run is in-memory only. Add `DiagnosticState` persistence if mid-onboarding abandonment proves common.
- **PD-3 beta tuning** of `DEFAULT_BAND_WALK_CONFIG` (start ranks, steps, item cap) + seed mastery ratios — post-launch from real data, as planned.

---

## Blockers (Must Resolve Before Starting)

| Blocker | Owner | Est. Cost |
|---------|-------|-----------|
| **Frequency rank per word** | Content (Track A) | Part of C3–C8; words must carry `frequency_rank` field in `words` table |
| **Pseudo-word library** | Content (Track A) | New CSV ingestion step; 50–100 vetted non-words; schema: `pseudo_words(id, word, phoneme_similarity_score)` |
| **Confirm-on-Yes flow** | Mobile (us) | Quiz session must support "meaning check" mode (show 3-option MC, require correct answer to confirm Yes) |
| **Foundation content volume** | Content (Track A) | At least 90% of Foundation (2,700+ words) must be sourced; sparse tiers → unreliable frontier estimates |

---

## Phase A: Schema & Content Setup (Content-Tool)

- **PA-1** — Add `frequency_rank` (integer) column to `words` table; populate from source CSVs during import (C3 step)
- **PA-2** — Ingest pseudo-words CSV; new `pseudo_words` table with id/word/phoneme_similarity; validation rules
- **PA-3** — Export both tables to bundled `words.db`; schema version bump

---

## Phase B: Mobile App Infrastructure

- **PB-1** — `DiagnosticState` domain model:
  - `currentBand` (frequency rank)
  - `stepSize` (halves on reversal)
  - `lowestNotKnown`, `highestKnown` (bracket bounds)
  - `standardError` (approx from bracket width)
  - `pseudoWordFalseAlarmRate` (0–1)
  - `itemsAnswered` (count, stop at 25)

- **PB-2** — `AdaptiveBandWalkEngine` — pure logic:
  - `selectNextItem(state, pool: Word[]): Word` — pick random word from current band
  - `processAnswer(state, answer: { claimed: boolean; confirmed?: boolean }): DiagnosticState` — update bracket, step size, SE
  - `shouldStop(state): boolean` — SE threshold or item cap
  - `estimateFrontierRank(state): number` — final rank from bracket midpoint
  - `applyPseudoWordCorrection(rank, falseAlarmRate): number` — downward adjust for overclaiming

- **PB-3** — `ConfirmOnYesQuizSession` — integration with existing quiz logic:
  - When user answers Yes to an item, automatically serve a 3-option MultipleChoice meaning check
  - Result (correct/incorrect) converts to confirmed/not-confirmed
  - Filters out pseudo-word results from user_progress seeding

- **PB-4** — `RunAdaptiveDiagnosticUseCase` (replaces current `RunDiagnosticUseCase`):
  - Initialization: load pool from tier, seed with self-segment band
  - Loop: select item → present (with confirm-on-Yes) → process answer → update state → check stop rule
  - Persistence: write diagnostic results + SRS seeding to user_progress
  - Resume: persist state mid-diagnostic, allow quit/resume

- **PB-5** — Knowledge Map calculation:
  - `estimateKnownCount(frontierRank, pool, pseudoWordCorrection): number`
  - Counts words below frontier (within free tiers), applies correction

- **PB-6** — SRS seeding (the payoff):
  - `seedInitialProgress(frontierRank, diagnosticAnswers, pool)`
  - Per word: position relative to frontier → mastery + next_review_date
  - Directly answered words override band heuristic
  - Writes append-only `user_progress` rows (no retroactive edits)

---

## Phase C: UI Integration

- **PC-1** — New `DiagnosticRunner` component (replaces current stride-sampler screen)
  - Item presentation: word + Yes/No buttons
  - Confirm-on-Yes: auto-serve 3-option check, show result
  - Pseudo-words: present identically (no visual flag)
  - Progress feedback: "8 of ~20 items" (SE updates the estimate)

- **PC-2** — Enhanced Knowledge Map screen:
  - Real frontier rank (not hardcoded)
  - Animated reveal with endowed-progress copy
  - SRS seeding confirmation message

- **PC-3** — Resume flow (graceful quit handling)

---

## Phase D: Testing & Tuning

- **PD-1** — Unit tests for `AdaptiveBandWalkEngine`:
  - Band-walk convergence (staircase behavior)
  - Step halving on reversal
  - SE approximation
  - Pseudo-word correction (0/1/2/3 false alarms)

- **PD-2** — Integration tests with 50-word pool:
  - Diagnostic runs to stop condition
  - Knowledge Map output
  - SRS seeding determinism

- **PD-3** — Beta tuning (post-launch):
  - Starting ranks per self-segment (adjust from spec defaults)
  - Step sizes (halving schedule)
  - SE threshold (bracket width)
  - Seed mastery values (bands relative to frontier)
  - Adjust from learner behavior data

---

## Effort Estimate

- **Phase A (Content):** 2–3 days (once C3–C8 complete)
- **Phase B (Logic):** 5–7 days (pure TS, no I/O complexity)
- **Phase C (UI):** 3–4 days (component wiring, confirm-on-Yes flow)
- **Phase D (Testing + beta tuning):** 2–3 days (initial); ongoing post-launch

**Total:** ~12–17 days of focused work, **post-launch after Foundation content is ~90% complete.**

---

## Decision Points

1. **Confirm-on-Yes load:** Every Yes or sampling only some? Spec assumes every Yes (honest signal), but measure in beta for UX friction.
2. **Thresholds:** All values in the spec (starting ranks, step sizes, SE bracket, seed mastery) are reasoned defaults. Tune from beta data; don't hardcode indefinitely.
3. **Pseudo-word placement:** Spec says mid-sequence (items 5–20 of ~25). Test for optimal false-alarm discrimination.

---

## Success Criteria

- Diagnostic places learners on frontier (vs. random or all-zero seeding)
- Knowledge Map shows realistic frontier estimate (validated against post-diagnostic SRS performance)
- SRS seeding concentrates day-1 reviews at learner's frontier (measured as higher engagement on frontier-band words)
- <2% overclaiming (pseudo-word false-alarm rate, detected via signal correction)
- Completion rate >90% (users don't quit mid-diagnostic)

---

## Notes

- **Deferred, not forgotten.** This plan is locked in. The blocker is purely content (frequency rank, pseudo-words) and depends on C3–C8 reaching ~90% volume.
- **Not IRT.** This is a simplified adaptive scheme (band-walk + SE-based stopping). Full Item Response Theory (3PL, calibrated item bank) is a future upgrade once real response data exists.
- **Backwards-compatible.** DIAG-A can be swapped in without changing SRS, Home, or paywall logic — it only affects onboarding seeding and Knowledge Map display.
