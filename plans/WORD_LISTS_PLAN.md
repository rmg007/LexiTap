# Word Lists — multi-list Saved Words, auto-populated "Learned" list

**Status:** draft (2026-07-05) — pending Ryan's accept.
**Goal:** Replace the flat, single "saved or not" bookmark with named lists.
Every user gets a default **Learned** list (auto-filled as they complete
Learn sessions — no manual action) and can create additional custom lists;
saving a word lets the learner choose which list it goes into.
**Issue:** none — user-initiated, not in ORCHESTRATION.md/ROADMAP.md.
**Related:** [`UI_UX_FIXES_PLAN.md`](UI_UX_FIXES_PLAN.md) Phase 19/20 (Learn
session recap + "All caught up" clarity) — that plan's Phase 20 "See your
progress" link should retarget to this feature's "Learned" list once it
ships (noted there too).

---

## Why this is its own plan, not a UI_UX_FIXES_PLAN phase
`saved_words` ([migration 003](../mobile/src/infrastructure/db/migrations/003_word_feedback.ts))
has `word_id TEXT PRIMARY KEY` — a word can be saved exactly once, full stop.
There is no list to attach a word to; multiple lists requires a **schema
migration** (a new join table or a composite key), which touches
`mobile/src/infrastructure/db/` — a CLAUDE.md **High-Risk Path** requiring
Ryan's explicit confirmation before any code lands. That's a different risk
class from the presentation-only fixes in `UI_UX_FIXES_PLAN.md`, hence a
separate plan.

## Decisions needed from Ryan
1. **List model:** exactly one system list ("Learned," auto-populated) plus
   user-created custom lists, or two system lists (keep today's manual
   "Saved" behavior as its own default list, separate from the new
   auto-populated "Learned" list)? This changes the migration shape and the
   save-flow UX. **No default recommended — this is a product decision, not
   a mechanical one.** My lean: two system lists ("Learned" = automatic,
   read-only membership; "Saved" = today's manual bookmark, renamed/kept as
   the default target for the existing bookmark icon) — because conflating
   "I finished this word" with "I deliberately want to revisit this" loses
   information the learner might care about. But this is your call.
2. **Can system lists be deleted/renamed?** Recommend: no — "Learned" in
   particular is a passive log of real learning history; deleting it should
   at most clear membership, not remove the concept.
3. **What happens to existing `saved_words` rows on migration?** All
   pre-existing rows have `source IN ('manual','learn','quiz')` (whatever
   values are actually in use — audit before writing the migration). Default
   recommendation: every existing row migrates into the "Saved" list
   (preserves current behavior exactly for existing users); "Learned" starts
   empty and fills going forward from Learn session completions only (not
   backfilled from history, since "which words were actually learned via the
   Learn flow" isn't reliably reconstructable from `saved_words` alone —
   would need to cross-reference `user_progress`/mastery history; scope that
   as a stretch goal, not a blocker).
4. **Save-flow UX:** does tapping the bookmark icon (LearnCard, LearnDetail,
   Quiz, etc.) still do a one-tap save to a default list (fast path,
   preserves current UX), with a secondary long-press/chevron to pick a
   different list? Or does every save always open a list picker (slower,
   more explicit)? Recommend: **one-tap to a default list + a way to
   move/add to other lists from the Saved Words screen** — preserves the
   existing fast bookmark UX (don't regress a feature that already works)
   while adding the list capability as an enhancement, not a tax on every save.
5. **List creation UI:** where does "create a new list" live — inline in the
   list picker sheet, or a dedicated management screen? Recommend: inline
   "+ New list" row in whatever picker/sheet Decision #4 produces — no
   separate screen needed for v1.

---

## Ground truth (read before touching anything)

[`003_word_feedback.ts`](../mobile/src/infrastructure/db/migrations/003_word_feedback.ts):
```sql
CREATE TABLE IF NOT EXISTS saved_words (
  word_id  TEXT PRIMARY KEY,
  saved_at INTEGER NOT NULL,
  source   TEXT NOT NULL DEFAULT 'manual'
);
```
[`savedWordQueries.ts`](../mobile/src/infrastructure/db/queries/savedWordQueries.ts):
`saveWord`/`unsaveWord`/`isWordSaved`/`getSavedWordCount`/`listSavedWordsPage`
— all keyed on bare `word_id`, no list concept anywhere in the query layer.

Callers of `saveWord` today (audit before migration, list is likely
incomplete — grep before starting): [`LearnCardScreen.tsx`](../mobile/src/presentation/screens/LearnCardScreen.tsx)
(`source: 'learn'`), the Quiz/feedback flow, and the word-detail screen if
it has its own bookmark. Each of these calls needs to become
"save to list X" instead of "save," per Decision #4.

[`SavedWordsScreen.tsx`](../mobile/src/presentation/screens/SavedWordsScreen.tsx)
is a flat, keyset-paginated list (`saved_at DESC, word_id ASC`) reached from
Progress's "Saved words" row. This becomes a **list-of-lists** view (or a
tab/segmented view if there are only ever 2 system lists + a handful of
custom ones — cheaper than a nested navigation for a small N).

The Learn flow ([`LearnCardScreen.tsx`](../mobile/src/presentation/screens/LearnCardScreen.tsx) →
[`LearnQuickCheckScreen.tsx`](../mobile/src/presentation/screens/LearnQuickCheckScreen.tsx) →
[`learn-check.tsx`](../mobile/app/learn-check.tsx)) is where "Learned" list
auto-population hooks in — the natural point is `LearnQuickCheckScreen`'s
completion (same point `UI_UX_FIXES_PLAN.md` Phase 19 adds the recap
screen), not `LearnCardScreen`'s "Got it" (that's just read-exposure, no SRS
seed yet — a word isn't "learned" until it survives the quick-check).

---

## Core design principle — additive migration, same recipe as migration 003
No existing table is altered destructively. `saved_words` either gains a
nullable `list_id` (simplest, if Decision #1 is "one system list + customs")
or a new join table replaces it (if two system lists, since a word can then
belong to more than one list simultaneously — e.g. both "Learned" and a
custom "Business vocab" list). Confirm the shape against Decision #1 before
writing the migration; don't default to the simpler schema if the product
decision requires multi-membership.

## Out of scope
- Anything from `UI_UX_FIXES_PLAN.md` — that plan's Learn-recap/All-caught-up
  fixes (Phases 19–20) are independent and don't block on this landing.
- Retroactively reconstructing "Learned" list membership from mastery
  history for existing users (see Decision #3) — stretch goal, not v1.
- List sharing, export, or collaborative lists — not asked for, not building it.
- Reordering/sorting lists beyond the existing `saved_at DESC` — no ask for it yet.

## Phases

### Phase 1 — Schema migration 004 (guarded path, needs Ryan's confirmation to execute)
1. Design the migration per Decisions #1–3 above. Draft the exact DDL and
   get it reviewed before applying — this is `infrastructure/db/`, high-risk,
   confirmation required at execution time regardless of what this plan says.
2. Migrate existing `saved_words` rows per Decision #3.
3. Add the corresponding migration test (same pattern as
   [`migrations.test.ts`](../mobile/src/infrastructure/db/migrations/migrations.test.ts)
   asserting `m003`'s SQL shape).

**Done means:** `npm run check` GREEN + a fresh-install migration test and
an upgrade-from-003 migration test both passing.

### Phase 2 — Query layer: list-aware save/unsave/list/create
1. Rewrite `savedWordQueries.ts` (or add a sibling `wordListQueries.ts`) for
   the new shape: `createList`, `listLists`, `addWordToList`,
   `removeWordFromList`, `listWordsInList` (keyset-paginated, same recipe as
   today), `isWordInAnyList`/`isWordInList`.
2. Update every existing caller (`saveWord`/`unsaveWord`/`isWordSaved`/
   `getSavedWordCount`) to the new API surface, or keep thin
   backward-compatible wrappers if Decision #4 keeps a "default list"
   fast-path (recommended — minimizes churn at every call site).

**Done means:** `npm run check` GREEN, all existing saved-word tests
updated and passing against the new schema.

### Phase 3 — Learn flow: auto-populate "Learned" list
1. Hook into `LearnQuickCheckScreen`'s completion (or wherever
   `UI_UX_FIXES_PLAN.md` Phase 19's recap screen reads the finished batch)
   to call `addWordToList(LEARNED_LIST_ID, word.id)` for each word in the batch.
2. Idempotent — a word already in "Learned" (e.g., re-learned via some future
   flow) doesn't error or duplicate.

**Done means:** `npm run check` GREEN + a test confirming a completed learn
batch shows up in the "Learned" list immediately after.

### Phase 4 — UI: list picker on save + Saved Words → lists view
1. Build the list-picker UI per Decisions #4–5 (sheet/inline, "+ New list" row).
2. Rework `SavedWordsScreen.tsx` into a lists view — either a simple
   segmented/tab switcher (cheap, fine for a small number of lists) or a
   list-of-lists → tap into a list's contents (more scalable, slightly more
   screens). Recommend the segmented/tab approach for v1 given the expected
   list count is small (a handful, not dozens).
3. Wire every existing bookmark tappable (LearnCard, word detail, Quiz
   feedback if applicable) to the new save API from Phase 2.

**Done means:** `npm run check` GREEN + render tests for list creation, list
switching, and saving a word into a non-default list.

---

## Risks / gotchas
- **Phase 1 is a CLAUDE.md High-Risk Path** — stop and get explicit
  confirmation before writing to `infrastructure/db/`, per the project's
  standing rule, independent of this plan's own approval.
- Every current caller of `saveWord`/`isWordSaved`/`getSavedWordCount` needs
  auditing (grep, don't trust memory) before Phase 2 — a missed call site
  means a save silently no-ops or throws against the old schema shape.
- `source` column's actual current values need auditing before deciding the
  migration mapping in Decision #3 — don't assume the three values named
  above are exhaustive without grepping every `saveWord(...)` call site.
- Concurrent-session hazard: this touches `infrastructure/db/` and
  `presentation/screens/SavedWordsScreen.tsx`, both possibly touched by
  other in-flight work — check `git status`/open branches before starting,
  per the project's shared-file discipline (no `git add -A`, one owner per
  guarded path at a time).

## Docs to update on completion
- **AGENTS.md** — new schema pattern (list membership) + any new invariant
  (e.g. "Learned" list is append-only from the app's perspective).
- **CLAUDE.md** `infrastructure/db/` high-risk note — no new row needed (already
  listed), but the Documentation Rule still applies: confirm the migration
  strategy section of `DATABASE_SCHEMA.md` (if referenced) stays accurate.
- **`memory/MEMORY.md`** — new session note per the project's standard
  end-of-task convention, same shape as the `WORD_FEEDBACK_PLAN.md` entry.
