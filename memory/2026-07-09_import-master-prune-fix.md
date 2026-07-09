# Session: `import-master` prune — root-cause fix for the recurring zombie-words bug (2026-07-09)

## The bug

`import-master` was upsert-only: it wrote every word present in
`words_master.jsonl` into `working.db` but never touched a `words` row for a
word that had been *removed* from the master file. Combined with
`bootstrapWorkingForRelease` only bootstrapping from CSVs when `working.db` is
completely empty (a no-op once any content exists), removing a word from the
JSONL did **nothing** to `working.db` — it silently persisted forever and got
re-shipped on every future `release` (which rebuilds `words.db` fresh from
`working.db`).

This had already bitten twice: the 2026-07-05 "161 function words purged"
commit (`2b2c660`) only soft-deleted them in the *shipped* `words.db` directly;
the 2026-07-06 TOEFL `release` run silently re-shipped all 161 the next day.
The 2026-07-07 session (`2026-07-07_proper-noun-purge-and-zombie-words-bug.md`)
found + hand-fixed both that zombie batch and a fresh batch of 27 removed
proper nouns by manually deleting rows across 5 tables in `working.db`, but
explicitly flagged the root cause as unfixed and out of scope for a content
triage task.

## The fix

`content-tool/src/commands/import-master.ts`:

- `importMaster(db, records, { prune? })` — **default `prune: true`.** After
  the normal per-word upsert loop, any active `words` row whose id isn't
  among the imported records gets **soft-deleted** (`deleted_at`), and its
  `word_tiers` / `sense_examples` (no `deleted_at` column — hard delete) and
  `word_senses` / `word_questions` (hard delete, since a re-add always
  rebuilds them from scratch anyway) are cleaned up. Reuses the exact same
  prepared statements the existing "replace child rows clean-slate on
  re-import" path already used — no new SQL patterns.
- New exported `findPruneCandidates(db, records)` — pure read (active `words`
  rows absent from `records`), used both internally and by the CLI's
  `--dry-run` preview (via `openWorkingDbReadonly`, so a dry-run never
  materializes an empty working DB or writes anything).
- CLI: `import-master --no-prune` (mirrors the existing `--no-resume`/
  `--no-copy` convention) opts out for a deliberately partial master file.
  `--dry-run` now reports the prune-candidate count + a word sample.

**Default is prune-ON, not opt-in.** Audited every real invocation
(`cli.ts`, `PHASE3_4_RUNBOOK.md`, `categorize`/`enrich-master`'s "next"
hints, `master-store.ts`) — `import-master` is *always* run against the
whole canonical `words_master.jsonl`, never a filtered subset. An opt-in
flag would just be the same bug a third time.

Soft-deleting (not hard-deleting) the `words` row means re-adding a
previously-pruned word later is a plain upsert that clears `deleted_at` back
to `NULL` — no special-cased "undelete" path needed (`UPSERT_WORD`'s
`ON CONFLICT ... deleted_at = NULL` already does this).

**Tests** (`import-master.test.ts`, +5): the literal regression scenario (N
words → remove one from the file → re-import → pruned), cascade to all 4
child tables, `{ prune: false }` opt-out, re-add-restores-via-upsert, and
`findPruneCandidates` read-only behavior. content-tool 21 suites / **308
tests** green (was 303).

**Docs:** AGENTS.md's content-tool invariant already asserted "the master
file is authoritative" for child rows but was silently wrong about whole-word
removal — corrected + pointed at this note. `cli.ts` usage string updated for
both `import-master` and `import` (which forwards `.jsonl` sources to it).

## Live validation + concurrent-session note

This session ran on the same checkout as a parallel content-triage session
(`2026-07-09_proper-noun-purge-wave2.md`, commit `7e3171f`). Mid-session, a
`--dry-run` smoke test found 41 words live in the local `working.db` absent
from the just-committed master file — a real, real-time instance of exactly
the bug this fix targets. Deliberately did not run a real (non-dry-run)
import at that point, since the other session was still actively working the
same content thread (concurrent-session entanglement risk). That other
session went on to run the real release pipeline itself (`words_master.jsonl`
4372→4332, `words.db` `user_version` 4→5) in the same shared checkout —
since `tsx` runs straight from source, it transparently picked up this
session's not-yet-committed prune logic. Re-ran the dry-run after their
commit landed: **`no active words are absent from the source — nothing
would be pruned`** — confirmed already reconciled, nothing left to do here.
Per their note, they intentionally left `AGENTS.md`/`cli.ts`/
`import-master.ts`/its test uncommitted for this session to commit.
