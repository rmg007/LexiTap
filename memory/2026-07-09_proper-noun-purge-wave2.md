# Session: Proper-noun purge wave 2 — full corpus sweep, cities/states/names (2026-07-09)

Follow-up to [2026-07-07's targeted 32-word triage](2026-07-07_proper-noun-purge-and-zombie-words-bug.md).
Ryan asked to "remove country and city names and all proper nouns" — pushed back
first (country/continent/nationality names are core A1/A2 ESL vocabulary, not
junk) and got scope confirmed: **purge people/city/institution names app-wide,
keep country/continent/nationality vocabulary.**

## Method

Regex-scanned all 4372 `definition` fields for name/place/title patterns
("first name," "surname," "a city in," "a state in," "university," etc.), then
cross-referenced the corpus against static lists of US states, major world
cities, and common English first/last names to catch anything phrased
differently. Read every hit's actual definition before deciding — same
per-word judgment discipline as the first pass, not a blanket keyword purge
(false positives like `department`, `corporation`, `governor`, `bell`, `cook`,
`green`, `hall`, `hill`, `king`, `lee`, `mark`, `price`, `white`, `wood`,
`young` all have legitimate generic definitions unrelated to being anyone's
name — left untouched).

## Decisions

**Removed (40):** william, california, james, george, chicago, robert, thomas,
charles, ohio, mary, texas, richard, paris, la, illinois, boston, virginia,
michigan, pennsylvania, oxford, michael, philadelphia, martin, jones,
carolina, ma, arthur, kansas, iowa, davis, rome, elizabeth, wisconsin, ny,
jackson, lewis, al, ed, el, iii — first names, surnames, US states/cities,
capital cities, and initial/abbreviation stubs (`al`/`ed`/`el` = bare
name-abbreviation shorthand with zero enrichment; `iii` = Roman numeral whose
only illustrated use was a royal-name suffix, not standalone vocabulary).

**Fixed in place, not removed (2 — dual-meaning words where the legitimate
sense survives a definition edit):**
- **frank**: was `pos: noun`, def "A first name for a man; honest and direct
  in speech." — rewritten to `pos: adjective`, def "Honest and direct in the
  way you speak, even about difficult things." Zero senses/questions existed
  (stub), so no quiz content was at stake; the name framing is gone entirely.
- **taylor → tailor**: a real pre-existing **spelling bug**, unrelated to the
  proper-noun sweep — the occupation ("a person who makes or repairs
  clothes") was spelled with the surname spelling throughout the whole
  record (definition, 3 examples, 5 questions). Renamed the word + fixed every
  `taylor`→`tailor` occurrence across the record. `word_id` changes on
  rename (derived from the word text), so the old `working.db` row was
  deleted and a fresh one inserted via `import-master`, same recipe as the
  removals below.

**Kept, tagged `reviewed: true` (23 — legitimate ESL vocabulary confirmed via
this sweep):** country/continent names england, canada, india, europe, china,
france, germany, mexico, australia, usa, italy, israel, russia, asia, ireland,
spain, britain; plus generic titles/abbreviations independent of any specific
named entity — mr, miss (titles, like Mrs/Dr), st (abbreviation for
street/saint), co, ltd, univ (generic business/institution abbreviations, not
bound to one company/university).

## Pipeline + numbers

Same recipe as 2026-07-07: edit `words_master.jsonl` → manually delete the
removed words' rows from `working.db` across 5 tables (`words`, `word_tiers`,
`word_senses`, `sense_examples`, `word_questions` — `import-master` is
upsert-only, confirmed again it doesn't prune) → `import-master` to
upsert the fixes/tags → `validate --strict` (0 errors) → `release`.

`words_master.jsonl` 4372→4332 lines. Shipped `words.db` 4372→4332 words,
`user_version` 4→5. `validate --strict`: 0 errors / 2574 warnings (same
pre-existing `theme:'General'` debt). content-tool 308 tests / mobile 617
tests green.

## ⚠️ Concurrent-session hazard (same working tree, not a worktree)

The `task_b1d2fed6` follow-up ("add a prune step to `import-master`") that
this session itself spawned was started by Ryan in **a separate local
session on the same checkout** — mid-session, `git status` showed
`AGENTS.md`, `content-tool/src/cli.ts`, `content-tool/src/commands/
import-master.ts`, and its test file all modified and uncommitted, alongside
my `words_master.jsonl` edits. Confirmed via `import-master`'s own output
gaining a new `/ N pruned` field mid-session (its code had changed under me).
**Did not touch or stage those 4 files** — committed only
`words_master.jsonl` + `mobile/assets/vocab/words.db` (the files this task
owns), leaving the prune-step commit for that other session to make itself.
Re-confirmed the standing lesson: never `git add -A` on a shared tree; verify
`git status` file-by-file before staging.
