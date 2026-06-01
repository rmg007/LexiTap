# C5 Validation Run + Validator Glue-Regex Fix (2026-05-31)

**C5 = PASS.** `cd content-tool && npm run cli validate -- --strict` on the C4-enriched working.db:
`2881 rows checked, 0 errors, 2802 warnings`. Zero errors → DB is release-eligible (C7/C8 fail-closed gate only aborts on errors; warnings never block). `data/output/words.db` also at 2,881 words / user_version=1.

DB state confirmed: working.db = 2,881 words / 2,894 memberships / **2,881 real defs (all have definition_license) / 0 empty defs**. Matches commit `0cc4d45` (C4 complete). DBs are build artifacts (NOT git-tracked) — rebuilt from `data/input/*.csv`.

## Validator bug fixed (commit this session)
`hasInTokenUnderscore` used `/\S_|_\S/` → flagged a blank next to **normal punctuation** ("eat _.", "help _?") the same as a real mid-word break ("cataly_t"). 338 false positives buried the 4 real cases. Narrowed to `/[A-Za-z0-9]_|_[A-Za-z0-9]/`. Warnings 3141 → 2802. +1 regression test, 97 green.

## Remaining 2802 warnings = KNOWN CONTENT DEBT (triaged, NOT new — do not re-investigate)
| Count | Warning | Verdict |
|---|---|---|
| 2798 | `theme: 'General' is not in the theme taxonomy` | **Content decision for Ryan.** The 3k-word foundation expansion was bulk-sourced with placeholder `theme='General'` (baked into `data/input/foundation*.csv`, ~3000 rows each across 3 near-dup files). Words still quiz fine; they just collapse into one undifferentiated theme bucket. Real fix = categorize 2790 words into the taxonomy (AI-assisted content task). NOT a code bug. |
| 4 | `blank '_' is inside a word token` | Real but minor. AI-generated during C4 enrich (NOT in CSV source): work→"She _s in a hospital", great→"one of the _s of science", language→"three _s fluently", element→"two _s: hydrogen". The `_s` suffix leaks plurality. Not durably fixable without an enrich-prompt change + re-run; DB-only patch is lost on rebuild. |

## Open content questions for Ryan (not unilaterally actionable)
1. Ship with `theme='General'` for ~2790 words, or invest in real theme categorization pre-launch? (depends how prominently the app surfaces theme)
2. 3 near-identical foundation CSVs (`foundation.csv`, `foundation-3k.csv`, `foundation_3000.csv`, ~3000 rows each) — dedup collapses to 2,881 by stable word-id so no double-count, but the triplicate sources are confusing. Consolidate to one canonical CSV.
3. The 4 `_s` enrichment sentences — fix via enrich-prompt tweak + targeted re-run, or accept as minor.

**Re-running C5 later:** expect `0 errors, ~2802 warnings`. That is the known-good baseline, not a regression.
