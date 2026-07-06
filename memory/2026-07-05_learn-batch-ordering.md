# Session: Learn-batch ordering — difficulty-first, `created_at` removed (2026-07-05)

**One-line query fix** to `selectNewWords` ([wordQueries.ts](../mobile/src/infrastructure/db/queries/wordQueries.ts)). Triggered by Ryan's "are we choosing random 10 words?" → traced the whole batch path.

## The problem
"Learn new words" (Home) pulls the next 10 never-seen words for a tier via `StartQuizUseCase` → `getNewWords(tierId, 10)` → `selectNewWords`. Old ordering was **`ORDER BY w.created_at ASC`** — content-pipeline insertion order, i.e. an accident of which CSV/enrichment pass wrote the row. So a trivial A1 word and a hard C1 word could sit adjacent in the same batch purely by authoring order. Deterministic, but pedagogically random.

## The fix
**`ORDER BY w.difficulty ASC, w.frequency_rank ASC`** — easiest-first, most-common as tiebreak. `created_at` removed entirely.

## Why `difficulty`, not `cefr_level` or `frequency_rank` alone
Grounded in the actual `words.db` (foundation tier = 2,848 words, the pool "Learn new words" uses):

| Column | Foundation coverage | Verdict |
|---|---|---|
| `cefr_level` | **58 / 2848 (2%)** | unusable — sorts as ~all-NULL (known bulk-expansion content debt) |
| `frequency_rank` | 2790 / 2848 (98%) | usable proxy, but corpus-commonness ≠ difficulty |
| **`difficulty`** | **2848 / 2848 (100%), range 1–4** | direct difficulty rating, zero gaps → primary sort |

Ryan explicitly wanted `created_at` out and disliked `frequency_rank` as the main signal — `difficulty` is the right answer and he confirmed the "don't mix A1/C1" intent. `frequency_rank` kept only as a within-band tiebreak.

## Verify
62 suites / 570 tests green. No test pinned the old ordering. Guarded path (`infrastructure/db/`) → lifted deny / edited / restored net-zero (verified `git diff .claude/settings.json` empty).

## Follow-up (content, Ryan-owned — NOT done)
- **Backfill `cefr_level` on foundation** (2,790 unlabelled words). Once populated, revisit whether the learn batch should order by CEFR band instead of / on top of `difficulty`. Until then CEFR ordering is a no-op. Flagged in AGENTS.md invariant + the query comment.
- No skill created — this was a one-line ORDER BY fix, not a reusable workflow (evaluated + rejected; a skill would be padding).
