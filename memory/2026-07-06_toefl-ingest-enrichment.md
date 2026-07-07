# Session: TOEFL 3000 ingest + cheap-model enrichment shipped (2026-07-06)

**Plan:** [`plans/TOEFL_INGEST_PLAN.md`](../plans/TOEFL_INGEST_PLAN.md) — full detail, numbers, defects found.

Ryan handed over a 3000-word TOEFL vocabulary list (bare words, extracted from a PDF, "ordered by
difficulty"). Answered "how do we insert them" honestly: mechanical insert is worthless — a bare
word can't be quizzed/learned. The real work is enrichment, and that's what got built + run.

**Numbers:** 2895 unique source words → Phase 0 offline filter (dedup/lemmatize/zipf-obscurity, no
API) → 2025 clean + 708 flagged-for-Ryan (obscure, untouched) + 162 auto-dropped. Ingested 2025 as
stubs, ran 4 `gpt-4o-mini` enrichment passes (resume-safe, each pass mops up the model's own
transient failures) → **1837 TOEFL words fully enriched, ~1500 pre-existing foundation words also
enriched** (folded into the same backlog per Ryan's "enrich both together" call). **Shipped:
`words.db` user_version=3, 4560 words total (up from 2881), copied to `mobile/assets/vocab/`.**
Total spend ≈ $8 (four `gpt-4o-mini` passes), not the originally-estimated $75+ premium-model cost.

**Real pipeline bugs found + fixed (all covered by new regression tests, content-tool 303 / mobile
614 tests green):** empty-string definition sentinel broke the whole-file parser (→
`PENDING_DEFINITION` sentinel in `master-store.ts`); `frequency_rank: null` sorts FIRST in SQLite ASC
(would've put new words ahead of common ones — regression of the 2026-07-05 ordering fix); the
`diagnostic` tier (2026-07-05, 49 words) was never registered in `lexitap.config.json` — a
**pre-existing bug** that blocked the entire JSONL pipeline and had gone undetected for a month
because nothing had re-run `enrich-master`/`categorize` since; the model sometimes misread the new
`needs_base` prompt flag as a reason to *skip* a word rather than generate it — caught via a timing
test before the full spend, fixed with explicit prompt guardrails.

**Content defects found via multi-agent review** (2-lens quality audit + a dedicated corpus-wide
safety sweep — both got heavily rate-limited by Anthropic mid-run, ~2% full coverage on the quality
audit, ~67% on the safety sweep before its verify phase also failed): **removed "bestiality"** — an
explicit-content word that had been fully quizzed into a 13+ ESL app (definition + senses + 5
questions); **fixed "slate"'s** broken `fill_blank` question (tested the wrong word); **fixed 3
near-synonym pairs** with byte-identical definitions (amazement/astonishment, gigantic/jumbo,
duplicate/clone) that tripped `validate --strict`'s dup-detector and would've made their quiz
ambiguous. Manually triaged ~11 other safety-sweep hits (`sex`, `drug`, `arms`, `rifle`, `obscenity`,
`profanity` — all legitimate dictionary words, false positives); left `sensual`/`mistress` as
gray-area for Ryan's later call, `moiety` as a poor-but-not-unsafe exam-tag fit.

**Spawned as a separate out-of-scope task** (`task_31c2a3fd`): the safety sweep surfaced ~36
**pre-existing** foundation-corpus words that look like proper nouns (`washington`, `london`, `john`,
`trump`, etc.) + 2 junk abbreviations (`ca`, `dc`) — needs per-word judgment (some sweep hits like
`australia`/`germany`/`japan`/`asia`/`british` are legitimate nationality vocabulary, NOT junk), not
a blanket purge, and none of it is TOEFL-scoped.

## ⚠️ Gotchas for the next agent

- **Never hand-edit `words_master.jsonl` while `enrich-master` is still running in the background**
  — it holds the whole file in memory and overwrites it wholesale on every batch flush, silently
  undoing any concurrent edit. Bit this session: a `bestiality` removal got clobbered by the next
  batch flush; only understood after checking `ps aux` for a still-running process.
- **Workflow `args` marshaling breaks down for arrays beyond a handful of items** — a 49-string array
  errored ("exceeds the maximum of 4096" after being flattened to a char array). Fix: embed data as a
  literal directly in the script body instead of passing through `args` for anything non-trivial.
- **Large parallel Claude-subagent workflow batches (~50-100 concurrent) can hit a *sustained*
  Anthropic rate limit**, not a transient burst — retrying the identical shape twice both failed
  near-100%. The lever is fewer/bigger chunks (reduce concurrent call count), not just waiting and
  retrying.
- **Honest residual risk:** ~98% of the newly-enriched content did NOT get adversarial multi-agent
  review due to the rate-limiting above. Mitigated by `reviewed:false` (existing project convention —
  matches how thousands of foundation words already ship) but not eliminated. If more issues like
  "bestiality" surface later, re-run the safety-sweep workflow (`scratchpad` script pattern documented
  in the plan) — cheap (word+definition only) and worth doing again once rate limits aren't a factor.

## Follow-ups for Ryan

- Review `content-tool/data/input/toefl_candidates/toefl_flag_review.csv` (708 obscure words) —
  mark any real TOEFL words to rescue.
- 188 TOEFL stub words never got enriched (`toefl_candidates/still_pending_holdout.jsonl`) — a future
  cheap pass can retry them; a few specifically wanted an "Art & Design" theme that doesn't exist in
  `VALID_THEMES` (art/craft vocabulary has no home in the current taxonomy).
- `sensual` and `mistress` (both TOEFL-tagged, already shipped) are gray-area content calls worth a
  second look — not blocking, not unsafe, just imperfect.
- The spawned `task_31c2a3fd` (foundation-corpus proper-noun cleanup) is unrelated pre-existing debt,
  surfaced as a side effect of this session's safety sweep.
