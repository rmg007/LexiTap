# Word Feedback Plan — Save-for-later + Difficulty self-signal

**Status:** ✅ IMPLEMENTED (2026-07-05) — commits `801248b` (data), `c4d800e` (UI), `14dc450` (review fixes). Both Feature 2 (Save) and Feature 1-light (optional "Too easy" accelerator) shipped as specced; a 28-agent adversarial review found + fixed 5 defects. Session-resume shipped alongside per [SESSION_RESUME_PLAN.md](SESSION_RESUME_PLAN.md). 62 suites / 570 tests green. Open questions Q1–Q4 below were resolved as recommended (decoupled saved list; Progress section not a tab; ease = +2; both F1-light + F2 shipped; ease + save also wired into QuizScreen review flow, closing the coverage gap).

**Original status:** proposed (2026-07-05)
**Scope:** two learner-requested features — (1) save/bookmark a word to review later, (2) tell the app a word is easy / hard / needs review.
**Grounded in:** 28-file SRS call-chain map + DB vertical-slice map (this session's two Explore agents), `SRS_FORGIVENESS_MECHANICS.md`, `QuizFeedbackStates.md`, `WordDetailBrowser.md §12`.

---

## 0. Honest take first (read before the specs)

**The two features are one user intent.** Ryan's three phrasings —

| Learner says | Really means | Mechanism |
|---|---|---|
| "this word is very easy to me" | stop showing it so often | push interval out / accelerate mastery |
| "I need to review this later" | let me collect it | **save/bookmark** (Feature 2) |
| "this word is difficult" | show it sooner | pull interval in |

— are the same mental model: *let me tell the app how I feel about a word.* Plan treats them as **one feature family** ("word feedback"), not two disconnected builds.

**Feature 2 (save) is clean. Build it fully.** Additive `user.db` table, zero conflict with any locked decision, and `WordDetailBrowser.md §12` *already* anticipated it ("archive/mute a word … requires writing new schema fields to user.db … defer to post-launch"). This is the deferred idea coming due. Low risk, high value, ship it.

**Feature 1 (difficulty rating) collides with three LOCKED decisions. Do NOT build Anki-style Again/Hard/Good/Easy.** Reasons, bluntly:

1. **Passive recognition is the product.** This very session we *removed* the self-report "do you know this word?" step from onboarding because it was redundant friction. Bolting a 4-way self-rating onto **every** answer re-introduces that exact friction ~40×/session. That's a regression of a decision made 3 hours ago.
2. **The feedback layer is locked to one calm `Continue`.** `QuizFeedbackStates.md` §6 + the "no celebratory burst, affirmation is calm" rule. Four rating buttons after each answer contradict the whole calm-single-decision design.
3. **`v1-fixed` is the sole SRS mutator and must stay replayable.** The two diagnostic seeders call `scheduler.next({... isCorrect: true ...})` purely to derive an interval ([RunDiagnosticUseCase.ts:81](../mobile/src/application/onboarding/RunDiagnosticUseCase.ts), [RunAdaptiveDiagnosticUseCase.ts:108](../mobile/src/application/onboarding/RunAdaptiveDiagnosticUseCase.ts)). Mutating `SchedulerInput.isCorrect` in place breaks onboarding. And SM-2 quality ratings are famously misused (users tap one button) — you'd take on 40 files of churn in the high-risk SRS zone for a signal most learners give noisily.

**Recommended Feature 1 instead — a light, optional, non-blocking "Easy" affordance.** Not a mandatory gate. On a **correct** answer only, an optional "Too easy — skip ahead" control that jumps the word's mastery/interval forward. The "difficult" direction already exists for free (a wrong answer → mastery −1 → requeued sooner, per `v1-fixed`). "Need to review" *is* Feature 2 (save). So the whole ask is satisfied by: **Save (F2) + an optional Easy accelerator (F1-light)** — no scheduler rewrite, no per-answer friction.

Everything below specs the recommended path. §6 documents the heavy SM-2 alternative and its cost so the trade-off is on record, not hidden.

---

## Feature 2 — Save word to review later  *(build this)*

Mirrors the `UserStats` vertical slice exactly (agent-confirmed simplest exemplar). All additive; no existing table or query changes.

### 2.1 Schema — migration 003 (append-only, forward-only)

New file `mobile/src/infrastructure/db/migrations/003_saved_words.ts`, appended to the `MIGRATIONS` ledger in [migrations/index.ts](../mobile/src/infrastructure/db/migrations/index.ts) (`TARGET_USER_VERSION` auto-bumps 2 → 3):

```sql
CREATE TABLE IF NOT EXISTS saved_words (
  word_id    TEXT    PRIMARY KEY,          -- one save per word; re-save is idempotent
  saved_at   INTEGER NOT NULL,             -- epoch ms
  source     TEXT    NOT NULL DEFAULT 'manual'  -- 'manual' | 'learn' | 'quiz' | 'browser'
);
CREATE INDEX IF NOT EXISTS idx_saved_words_saved_at ON saved_words(saved_at DESC);
```

Notes:
- `word_id` PK (not autoincrement) → save is naturally idempotent; unsave = DELETE by PK. No soft-delete — a save is not audit/replay state, it's a mutable user list (like a bookmark), so hard-delete is correct and keeps the table tiny.
- **No `tier_id`** — a word belongs to many tiers (m2m). Store only `word_id`; resolve tier/display at read time by joining `contentdb.words`. Avoids the "which tier owned it" ambiguity the WordDetailBrowser spec calls out.
- Confirmation-gated path (`infrastructure/db/`) — this is a high-risk edit; the migration is purely additive `CREATE TABLE`, no change to any existing table.

### 2.2 Vertical slice (each layer mirrors an existing file)

| Layer | New file | Mirror of |
|---|---|---|
| Domain type | `domain/user/SavedWord.ts` — `SavedWord { wordId; savedAt; source }` | `domain/user/UserStats.ts:8` |
| Repo port | same file — `SavedWordRepository { isSaved(id); list(); save(id, source); unsave(id) }` | `UserStats.ts:15` |
| Row type | `SavedWordRow` added to [rows.ts](../mobile/src/infrastructure/db/rows.ts) | `UserStatsRow` rows.ts:98 |
| Queries | `queries/savedWordQueries.ts` — `insertSavedWord` (INSERT OR IGNORE), `deleteSavedWord`, `selectIsSaved`, `selectSavedWordsPage` (keyset by saved_at) | `statsQueries.ts` |
| Mapper | `mapSavedWordRow` in [mappers.ts](../mobile/src/infrastructure/db/mappers.ts) | `mapUserStatsRow` mappers.ts:217 |
| SQLite impl | `repositories/SQLiteSavedWordRepository.ts` | `SQLiteUserStatsRepository.ts` |
| Container wiring | `savedWords = new SQLiteSavedWordRepository(db)` + expose reads in `buildReadQueries` | [container.ts:253,387](../mobile/src/composition/container.ts) |
| Services type | add to `ReadQueries` + `Services` in [ServicesContext.tsx](../mobile/src/presentation/services/ServicesContext.tsx) | existing entries |

**Saved-words list read** joins to content for display (parameterized, `deleted_at IS NULL` active filter):

```sql
SELECT w.id, w.word, w.definition, w.word_type,
       COALESCE(p.mastery_level, 0) AS mastery_level,
       s.saved_at
FROM userdb.saved_words s
JOIN words w              ON w.id = s.word_id AND w.deleted_at IS NULL
LEFT JOIN userdb.user_progress p ON p.word_id = s.word_id
ORDER BY s.saved_at DESC
LIMIT ?;
```
*(Query runs in the content-DB connection with user.db attached, same ATTACH pattern as `WordDetailBrowser` §5.)*

### 2.3 UI — two touch points + one list

1. **Save affordance** — a bookmark toggle (`Icon` `bookmark` / `bookmark-check`, new glyphs; fetch real Lucide path data per the icon rule) on:
   - `LearnCardScreen` (while learning a new word) — top-right of the card.
   - The post-answer `FeedbackLayer` — a small "Save this word" text/icon control **beside** Continue, never replacing it (keeps the calm single-primary layout). Optional; ignore-and-continue is one tap as today.
   - `WordDetailBrowser` rows when that screen ships (it's `target_file: TBD` — not built yet; wire the toggle when it is).
2. **Saved Words list** — new section on the **Progress** tab, above the tier cards. A `Card` "Saved words (N)" that navigates to a simple keyset-paginated list screen reusing the WordDetailBrowser row layout. If N=0, hide the section entirely (same pattern as the empty-tier filter added [this session](../mobile/src/presentation/screens/ProgressScreen.tsx)).
3. **No `TextInput`** anywhere near quiz/assessment screens (guardrail-enforced). The `source` field is set by the calling screen, not typed.

### 2.4 Tests
- `SQLiteSavedWordRepository` unit: save is idempotent, unsave removes, list orders by saved_at desc.
- `savedWordQueries` param-binding test (no interpolation).
- `migrations.test.ts` extended: `pendingMigrations(2)` returns `[003]`, `TARGET_USER_VERSION === 3`.
- `MockSavedWordRepository` added to test doubles (mirror `MockProgress`).
- Render test: bookmark toggles saved state; Progress "Saved words" section hidden at N=0.

### 2.5 Optional integration with review (defer decision)
Saved words *could* be force-surfaced in the review queue. **Recommend NOT at v1** — keep "save" as a personal list only, decoupled from SRS, so it never perturbs `v1-fixed` scheduling or the forgiveness cap math. Revisit after beta if users expect saved = prioritized. (Open question Q1.)

---

## Feature 1-light — optional "Too easy" accelerator  *(build this, not SM-2)*

### 1.1 Behavior
- Appears **only on a correct answer**, in the `FeedbackLayer` correct-state, as an optional secondary control: **"Too easy — skip ahead."** Ignoring it = today's behavior (mastery +1, normal interval). Tapping it accelerates the word.
- "Difficult" needs **no new control** — a wrong answer already does mastery −1 + requeue-sooner (`v1-fixed`). Don't add a redundant button.
- "Need to review" = the Save affordance (F2). Don't duplicate.

### 1.2 Scheduler change — additive, versioned, replay-safe (NOT an in-place edit)
The locked constraint: `v1-fixed` stays the sole answer-driven mutator and its interval math is frozen for replay. So **do not** change `SchedulerInput.isCorrect`. Instead add an **optional** field that `v1-fixed` treats as a bounded accelerator:

```ts
// Scheduler.ts — additive optional field, default undefined = today's behavior
export interface SchedulerInput {
  masteryLevel: MasteryLevel;
  isCorrect: boolean;
  now: number;
  ease?: 'easy';   // NEW, optional. Only meaningful when isCorrect === true.
}
```

`computeNextReview` ([v1-fixed.ts:37](../mobile/src/domain/srs/v1-fixed.ts)): when `isCorrect && ease === 'easy'`, jump mastery **+2** (clamp 5) instead of +1, and use that higher mastery's interval. Everything else unchanged. Because the field is optional and defaults off:
- The two diagnostic seeders (`isCorrect: true`, no `ease`) are **untouched** — no break.
- Replay stays faithful: `scheduler_version` remains `'v1-fixed'`; the `ease` choice is recorded on the append-only `quiz_attempts` row (new nullable `user_ease TEXT` column via migration 003, alongside `saved_words`) so a future FSRS can reconstruct exactly what the learner said. `is_correct` stays as-is.

This is the **forgiveness pattern** applied to acceleration: a bounded, optional, version-tagged nudge that sits *inside* the existing scheduler contract rather than forking it.

### 1.3 Files touched (small, from the SRS map)
- [Scheduler.ts](../mobile/src/domain/srs/Scheduler.ts) — add optional `ease?`.
- [v1-fixed.ts](../mobile/src/domain/srs/v1-fixed.ts) — handle `ease==='easy'` (+2 clamp). *(high-risk `domain/srs/` — confirmation-gated.)*
- [AnswerQuestionUseCase.ts:53](../mobile/src/application/quiz/AnswerQuestionUseCase.ts) — thread optional `ease` through to `scheduler.next` + onto the attempt row.
- `AnswerQuestionInput` — add optional `ease?: 'easy'`.
- `quiz/types.ts` `QuizAttempt` + `rows.ts QuizAttemptRow` + `attemptQueries.insertAttempt` + migration 003 — add nullable `user_ease`.
- [QuizScreen.tsx:150](../mobile/src/presentation/screens/QuizScreen.tsx) + [LearnQuickCheckScreen.tsx:90](../mobile/src/presentation/screens/LearnQuickCheckScreen.tsx) — pass `ease` from the optional control (default undefined).
- `FeedbackLayer.tsx` — render the optional "Too easy" control in the correct-state only.
- Tests: `v1-fixed.test.ts` (+ease cases), `AnswerQuestionUseCase.test.ts` (+ease path), render test for the control. Existing `isCorrect`-only tests keep passing unchanged (field is optional).

**~10 files, mostly additive, no signature break** — vs. ~40 files of breaking churn for SM-2 (§6).

---

## 3. Sequencing

1. **Migration 003 first** — one migration adds both `saved_words` table *and* the nullable `quiz_attempts.user_ease` column (one version bump, atomic). Confirmation-gated `infrastructure/db/`.
2. **Feature 2 slice** (domain → queries → repo → container → services) — independent, testable in isolation, no SRS touch.
3. **Feature 1-light** (scheduler `ease?` → use case → UI) — after F2 so the two `infrastructure/db` edits don't interleave on the same files.
4. **UI last** — bookmark glyphs, FeedbackLayer controls, Progress "Saved words" section.

F2 and F1-light are **not** path-disjoint (both edit migration 003 + rows.ts + attemptQueries + FeedbackLayer), so run them **sequentially in one worktree**, not as parallel agents.

## 4. Risks / guardrails
- **High-risk paths:** `infrastructure/db/` (migration, rows, queries) + `domain/srs/` (v1-fixed) — both confirmation-gated; expect the prompt, review diffs.
- **Replay integrity:** the `ease` accelerator MUST stay version-tagged `v1-fixed` + logged on the attempt row, or a future FSRS replay diverges. This is the load-bearing invariant.
- **No `TextInput`** in quiz/assessment screens (hook-blocked). Save `source` is caller-set.
- **Emoji rule:** bookmark icons via `Icon.tsx` with real Lucide path data, never emoji.
- **Don't couple saved-words to the SRS queue** at v1 (keeps forgiveness cap math pure).

## 5. Test/acceptance
- `mobile npm run check` green (currently 522 tests).
- Migration: fresh DB → user_version 3; existing v2 DB → 003 applies, existing rows intact.
- Save/unsave idempotent; Progress "Saved words" hides at 0, lists newest-first.
- "Too easy" on a correct answer → mastery +2 (clamped), longer next_review_date, `user_ease='easy'` on the attempt row; omitting it = identical to today.
- Diagnostics + all existing SRS tests unchanged and green (proves the additive field didn't regress the frozen path).

## 6. Rejected alternative — full SM-2 (Again/Hard/Good/Easy)
Documented so the trade-off is on record. Would require: change `SchedulerInput.isCorrect` → `rating` (breaks 2 diagnostic seeders), a new interval-by-rating table, a `v2-sm2` scheduler binding, 4-button UI in the locked calm-feedback layer, and updates across **~40 files incl. the entire high-risk SRS zone + 10 test suites** (per the SRS call-chain map). Cost: high, in the most fragile part of the codebase. Benefit: a self-report signal research shows is noisy and that contradicts the passive-recognition + calm-feedback product locks. **Not recommended for MVP.** Revisit only if post-beta retention data shows `v1-fixed` intervals are systematically wrong for real cohorts — at which point tune with real replay data, not self-report.

## 7. Open questions (Ryan)
- **Q1.** Should saved words be force-surfaced in the review queue, or stay a decoupled personal list? *(Recommend: decoupled at v1.)*
- **Q2.** Where should the Saved Words list live — a section on Progress (recommended, cheap) or its own tab? A tab is a native change (new route) needing a build; a Progress section ships via EAS Update.
- **Q3.** "Too easy" acceleration magnitude: mastery **+2** (recommended) vs. jump straight to the next interval tier vs. mark-mastered-outright. +2 is the conservative, reversible choice.
- **Q4.** Is F1-light even wanted, or is **Save (F2) alone** enough for now? Save covers "review later"; wrong-answers cover "difficult"; F1-light only adds the "easy" accelerator. Could ship F2 first, gauge beta feedback, add F1-light later.
