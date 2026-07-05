# Session Resume Plan — leave-anytime + resume-exactly

**Status:** accepted (2026-07-05) — implemented alongside WORD_FEEDBACK_PLAN in one build.
**Intent:** the learner can leave a study session at any point, be reassured nothing is lost, and pick up exactly where they left off. No-guilt, mirrors the locked ForgivenessSheet "Stop here, streak's safe" model.

---

## Problem (from the learn-card screenshot)

- "Back" is the only exit and it's a bare tertiary link — reads like "abandon + lose everything."
- The learn-card phase persists nothing ([LearnCardScreen.tsx:24](../mobile/src/presentation/screens/LearnCardScreen.tsx) "NO SRS write here"), so leaving loses your *place* (not data; the quick-check writes per-answer). Re-entering fetches a *fresh* batch.
- No resume, no reassurance. This is the deferred **PC-3 resume** item.

## Design

Two parts. Reviews already self-heal (answered words drop from the due queue), so resume focuses on the **learn flow** where place is genuinely lost; reviews reuse the existing Home due-count.

### Part A — reassuring exit sheet
New `ExitSessionSheet` component (mirror `ForgivenessSheet.tsx` structure + voice). Shown when the learner taps the header "Back" during a learn-card / quick-check session:
- Headline: *"Your progress is saved."*  Body: *"Pick up right where you left off, anytime."*
- **[Leave]** (primary) → exits to Home, snapshot preserved. **[Keep going]** (secondary) → dismiss.
- No red, no "you'll lose" copy. Swipe-to-dismiss = Keep going (safe default).

### Part B — persist the in-flight session → resume exactly

**Persistence = a single-row `active_session` table in user.db** (NOT AsyncStorage — [AsyncStorageAdapter.ts:6](../mobile/src/infrastructure/storage/AsyncStorageAdapter.ts) explicitly forbids structured learning data there; and migration 003 is already open for Save/Ease, so the marginal cost is one more additive `CREATE TABLE`). Single-row, `id CHECK(id=1)`, exactly like `user_stats`.

Migration 003 gains (third additive statement):
```sql
CREATE TABLE IF NOT EXISTS active_session (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  kind       TEXT    NOT NULL,          -- 'learn' (review self-heals; not snapshotted at v1)
  tier_id    TEXT    NOT NULL,
  payload    TEXT    NOT NULL,          -- JSON: { batch: Word[], stage:'card'|'check', index }
  updated_at INTEGER NOT NULL
);
```

Vertical slice (mirrors UserStats):
- `domain/user/ActiveSession.ts` — `ActiveSession { kind:'learn'; tierId; batch: Word[]; stage:'card'|'check'; index }` + `ActiveSessionRepository { get(); save(s); clear() }`.
- `ActiveSessionRow` in rows.ts; `mapActiveSessionRow` in mappers.ts (JSON.parse defensive, corrupt → null — same pattern as onboarding_state).
- `queries/activeSessionQueries.ts` — `upsertActiveSession` (INSERT OR REPLACE id=1), `selectActiveSession`, `deleteActiveSession`. Parameterized.
- `SQLiteActiveSessionRepository`.
- container: construct + expose in ReadQueries: `getActiveSession()`, `saveActiveSession(s)`, `clearActiveSession()` (all fail-soft). Add `DELETE FROM active_session` to `clearUserData`.
- ServicesContext + mockServices: add the 3 methods.

Wiring:
- **LearnCardScreen** — after batch load and on each "Got it" advance: `saveActiveSession({kind:'learn', tierId, batch, stage:'card', index})`. Payload stores the **full batch JSON** (≤10 words, same shape already passed via router params — no re-fetch on resume). Accepts optional `resumeBatch?/resumeIndex?` props; when present, skips the fresh fetch and rehydrates.
- **LearnQuickCheckScreen** — on each advance: update snapshot `{stage:'check', index:checkIndex}`. On `onComplete`: `clearActiveSession()`.
- **Routes** `app/learn.tsx` + `app/learn-check.tsx` — accept `resume=1`; when set, read the snapshot and pass batch/index instead of fetching / reading router-param batch.
- **HomeScreen** — read `getActiveSession()` on focus (`useFocusEffect`); when a learn session exists, render a **"Resume learning (n/10)"** `Card` above "Ready for today" that routes to `/learn?resume=1` (or `/learn-check?resume=1` when `stage==='check'`). Cleared snapshot → card disappears.

## Edge cases
- **App killed mid-write:** snapshot is a single-row REPLACE; worst case it's one advance stale — resume lands one card earlier, harmless.
- **Tier changed / stale snapshot:** snapshot carries `tierId`; if Home's active tier differs, still offer resume for the snapshot's tier (it records its own tier). A snapshot older than N days could be ignored, but not needed at v1 (learn batches are ephemeral; resume-or-restart both fine).
- **Batch words soft-deleted between save and resume:** batch JSON is self-contained (already-fetched Word objects), so resume renders them regardless; the quick-check pool is the same batch. No content re-read to break.
- **Completing normally clears the snapshot** → no phantom resume card.

## Tests
- `activeSessionQueries` param-binding (no interpolation; upsert REPLACE id=1).
- `SQLiteActiveSessionRepository`: save→get round-trips the batch JSON; clear removes; get on empty → null; corrupt payload → null (defensive).
- `migrations.test.ts`: covered by the shared 003 assertion (version 3).
- HomeScreen render: resume card hidden when `getActiveSession → null`, visible with "n/10" when present, routes on press.
- LearnCardScreen render: exit taps open `ExitSessionSheet`; "Leave" calls onExit, snapshot untouched.
- `clearUserData` wipes `active_session`.

## Out of scope (v1)
- Review-session snapshotting (reviews self-heal via the due queue; Home already shows the due count).
- Cross-device resume (snapshot is device-local, like freeze state).
