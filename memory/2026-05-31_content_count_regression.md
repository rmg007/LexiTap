# words.db 43 vs 216: NOT an m2m regression — deliberate downsizing (2026-05-31)

## TL;DR

Bundled `words.db` had **43** words. This was **NOT** content lost in the
many-to-many junction refactor. It was a **deliberate content downsizing**
(commit `5c190d2`) that replaced the 216 curated words with 9 tiers × 5-word
samples. The original content is fully recoverable from git history.

Decision (Ryan): **restore + merge to 246.** Done — input CSVs restored from git,
rebuilt, copied to the mobile bundle. Result: **241 unique words / 246 tier
memberships** across 9 tiers. The input CSVs and the mobile `words.db` are both
git-tracked, so the restore is durable on commit.

> **⚠️ SUPERSEDED later the same day.** The 241/246 restore was overtaken by
> concurrent C3 content sourcing (commits `f8a9ddd` "Expand Foundation tier to
> 3,000 words", `4526bb6`, `eccf83d`): `words.db` now holds **2,881 words /
> 2,894 memberships** (foundation 2,848, advanced 10, toefl 6, six exam/common
> tiers × 5). The 241 figures throughout this note are historical. The
> **root-cause analysis below — m2m refactor `a85d8d9` was innocent; `5c190d2`
> did the downsizing — remains valid and is the lasting lesson.** Status docs
> were synced to 2,881.

## Ground truth (all verified)

| Count | What it is |
|------|-----------|
| **216** | Original curated content: `foundation 200 + advanced 10 + toefl 6`. Built under the OLD single-`words.tier_id` schema. |
| **43** | 9 tiers × 5-word uniform sample (45 memberships, 43 unique). The reverted state. Pipeline built it correctly. |
| **241 / 246** | After restore+merge: **241 unique words, 246 memberships**. 5 sample words overlap restored words and the m2m junction correctly collapses each to one row tagged into 2 tiers: `ambiguous`(advanced+gre), `improve`(common3k+foundation), `pragmatic`(gre+ielts), `significant`(ielts+toefl), `weather`(common3k+foundation). Per tier: foundation 200, advanced 10, toefl 6, business/common3k/common9k/gmat/gre/ielts × 5. |

## Root cause — the culprit commit (both b5cbc74 and 5c190d2 are ancestors of HEAD)

1. `b5cbc74` "Add… **200-word Foundation tier**" — seeded the real 216
   (foundation 200 / advanced 10 / toefl 6). Old schema: single `words.tier_id`.
2. `a85d8d9` "feat(schema): word↔category many-to-many" — schema swap
   `words.tier_id` → `word_tiers` junction. **Did NOT touch content.** ← the
   refactor the task suspected; it is innocent.
3. `307f56e` — added empty CSV templates for the 6 new exam/common tiers.
4. **`5c190d2` "content: update CSV input data for all tiers"** (2026-05-31
   06:47) — **THE DOWNSIZING.** Diffstat: `foundation.csv −195`, advanced −5,
   toefl −1, +2 rows each to the 6 new tiers. The current 5 foundation words are
   an exact subset of the old 200.

## Pipeline is healthy — no bug to fix there

Architecture (CSV-driven, NOT a `seed-data.ts`):
`content-tool/data/input/<tier>.csv` (one per tier) → `working.db` →
`content-tool/data/output/words.db` → **manual `cp`** to
`mobile/assets/vocab/words.db`. There is no `build:mobile` script; `paths.ts`
documents the copy as a separate step. `npm run build:db` (= `tsx src/cli.ts
export`) bootstraps `working.db` from the CSVs **only when working.db is empty**
(`bootstrapWorkingIfEmpty`), so a rebuild needs the working db cleared first.
Export validates with `strict:false` (only hard errors block; theme-taxonomy /
in-token-blank checks are warnings). 43 CSV rows → 43 in words.db; no
dedup/subset-export bug.

## Git tracking (restore IS durable)

`.gitignore` only ignores `content-tool/data/output/*.db` and
`content-tool/data/working/` (build artifacts — correct). The **authored input
CSVs** (`content-tool/data/input/*.csv`) and the **mobile bundle**
(`mobile/assets/vocab/words.db`) are **git-tracked** — `git ls-files` lists them,
and after the rebuild they show as `M` (modified). Committing the working tree
persists the 246-word content; it will NOT silently revert on a fresh clone.

## Rebuild procedure (done locally)

```bash
cd content-tool
git show 5c190d2~1:content-tool/data/input/foundation.csv > data/input/foundation.csv
git show 5c190d2~1:content-tool/data/input/advanced.csv   > data/input/advanced.csv
git show 5c190d2~1:content-tool/data/input/toefl.csv      > data/input/toefl.csv
rm -f data/working/working.db data/output/words.db   # force clean re-bootstrap
npm run build:db                                     # -> 241 words, user_version=1
cp data/output/words.db ../mobile/assets/vocab/words.db
```

Verified on `mobile/assets/vocab/words.db`: 241 words, 246 memberships, 9 tiers,
`PRAGMA integrity_check`=ok, FK check clean, `user_version`=1. The 6 original CSV
files for the new exam/common tiers (5 words each) were left untouched.

## content_tiers.word_count

Written by export from observed membership counts, so after rebuild it is correct
per tier (foundation 200, advanced 10, toefl 6, others 5). The mobile app reads
counts via the `word_tiers` junction anyway, not this column.

## Earlier memory notes were wrong about this

[[2026-05-31_repo_state_reconciliation]] / [[2026-05-31_schema_many_to_many]]
implied 216 was the current/expected count and that content volume was "~7%".
Reality: this branch deliberately shipped 43 stub words. Volume expansion to the
real target (200+ foundation, populated exam tiers) is still the separate C3–C8
enrichment long pole — distinct from this restore.

## Verification

- `cd content-tool && npm run check` → 43 tests pass (lint+typecheck+vitest).
- `cd mobile && npm run check` → 163 tests pass (lint+typecheck+jest).
- No mobile/content test hard-codes a word count, so the 43→241 change broke
  nothing. The C0 sim-smoke harness (`mobile/scripts/sim-smoke.sh`,
  `npm run smoke`) was NOT run here (needs a booted iOS sim) but its earlier
  43-row assertion in [[2026-05-31_ios_build_posthog_metro]] is now stale —
  expect 241 words / 200 foundation if re-run.

## Note: work landed on `master`

By the time this ran, the working dir was on `master` (HEAD `4ef5af0`), not the
original `fix/ios-build-posthog-core-resolution` branch — the repo moved during
the session. Both `b5cbc74` and `5c190d2` are ancestors of `master`, so the
analysis is unaffected. The restore (3 modified CSVs + rebuilt `words.db`) sits
uncommitted in the `master` working tree.
