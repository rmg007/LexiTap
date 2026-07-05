# Session: Diagnostic UX overhaul + function word purge + curated pool (2026-07-05)

**Commits:** `446d2d7`, `788c73e`, `2b2c660`, `eab6693`

---

## What changed

### 1. Goal-selection screen cut (`446d2d7`)
`OnboardingGoalSelectionScreen` removed from the flow. `welcome.tsx` now routes directly to `/onboarding/diagnostic`. The diagnostic still computes a starting band but defaults to `A2` (no goal signal). Rationale: one less friction screen; onboarding is now welcome → age-gate → diagnostic → knowledge-map-reveal.

### 2. Quiz-first diagnostic UX (`788c73e`)
**Problem:** Two-step flow (ask "do you know this word?" → then quiz) was redundant and the "No, not yet" button was barely visible.

**Fix:** Real words skip the `ask` phase entirely and go straight to `confirm` (the MultipleChoice quiz). "I don't know this word" `variant="secondary"` Button is the skip path on the quiz screen.

- Pseudo-words still use the `ask` phase (they must — no correct meaning to quiz on; lie-detection preserved).
- `handleSkip` callback fires `processAnswer` with `claimed: false, confirmed: false` and advances the walk.
- Header changed to "Do you know this word?" on the quiz screen (consistent phrasing).
- `advance()` in `OnboardingAdaptiveDiagnosticScreen.tsx` now sets `{ kind: 'confirm', word }` directly for real words.

### 3. Function word purge (`2b2c660`)
**Problem:** Diagnostic showed words like "which", "he", "at", "from", "are" — clearly not vocabulary.

**Fix:** 161 function words soft-deleted from `words.db` (`deleted_at` timestamp set) and removed from `words_master.jsonl`.

Purge criteria:
- POS in `('conjunction','particle','pronoun','determiner','preposition')`
- Explicit list of common function words (articles, modals, auxiliaries, adverbs of degree, etc.)
- Pass 2: 18 additional misclassified words (`had`, `only`, `more`, `many`, `few`, etc.)

Active word count: **2,881 → 2,720**

### 4. Curated 49-word diagnostic tier (`eab6693`)
**Problem:** Diagnostic was pulling from the full `foundation` pool, many of which have NULL `frequency_rank` — the adaptive engine's `selectNearestWord` needs frequency_rank to work.

**Fix:** Created a `diagnostic` content tier (`content_tiers`) with 49 hand-selected words that all have `frequency_rank` set, spanning A1→B1.

`diagnostic.tsx` now uses `DIAGNOSTIC_TIER = 'diagnostic'` instead of the first active tier.

**49 words by difficulty:**
- A1 (rank 126–362): water, school, health, home, question, person, family, hand, book, money
- A2 early (rank 516–796): size, mind, night, activity, temperature, natural, situation, library, heart, strong, fire, difficult, technology, idea, love, week, difference, hospital
- A2-B1 (rank 806–1086): simple, door, culture, distance, machine, patient, access, success, friend, effort, positive, impact, balance, develop, allow, forest, independent
- B1-B2 (rank 1803–1829): ancient, aware, native, device

Adaptive engine walks this pool — knows "water" → climbs toward "impact" and "independent".

---

## Known follow-up

**`learn-loop.yaml` Maestro test needs updating before next E2E run.** The test currently clicks "No, not yet" to drive through the diagnostic — that element no longer exists for real words (only pseudo-words). Real words now show a MultipleChoice quiz. The test must either tap a quiz option or tap "I don't know this word".

---

## Invariants / lessons

- `selectNearestWord` requires `frequency_rank` to be non-NULL — always verify pool words have ranks before creating a curated tier.
- Pseudo-word ask phase is load-bearing for lie-detection — real words skip it, pseudo-words must not.
- words_master.jsonl is the source of truth; words.db is derived. Both must be kept in sync on any content mutation.
- Function words that slip through POS filtering need an explicit word-list pass — "had" (tagged `verb`) is an example.
