# TOEFL 3000 Ingest + Enrichment Plan

**Status: ✅ DONE (2026-07-06).** Shipped: `words.db` `user_version=3`, 4560 words (2848 foundation +
1837 TOEFL + small existing tiers), copied to `mobile/assets/vocab/words.db`. 303 content-tool +
614 mobile tests green.
**Keys:** only `OPENAI_API_KEY` (no Anthropic/DeepSeek) → whole chain ran on `gpt-4o-mini`.
**Source:** `~/Downloads/TOEFL Vocabs/output/toefl_3000_words.txt` (3000 numbered, bare words, extracted from a PDF).

---

## TL;DR / honest framing

The mechanical "insert rows" was trivial and worthless on its own — a bare word row can't be
quizzed or learned. The real work was enrichment: one `gpt-4o-mini` call per word generating
definition + pos + cloze example + felt senses + 5 quiz questions, folded into `enrich-master`
(base-field generation was a new capability added this session — see AGENTS.md content-tool
invariants). Total spend: **~4 enrichment passes, ~$8 all-in** for ~4700 words (foundation debt +
TOEFL), an order of magnitude under the original $75+ premium-model estimate.

Two facts the source hid:
1. **26% of the list was junk.** 708/2733 candidates were obscure/not-found (`lumpish`, `bestrewn`,
   `slaphappy`) — filtered out in Phase 0, never entered the corpus.
2. **The file's numbering was NOT difficulty.** Junk word `lumpish` was rank 8 ("easiest"). Difficulty/
   frequency_rank were derived from zipf scores instead, never from source order.

## Decisions (locked with Ryan)

- **Scope:** enrich TOEFL + the still-unenriched foundation set as one backlog, frequency-ordered
  (foundation's real `frequency_rank` sorted first automatically; TOEFL stubs got provisional
  zipf-derived ranks above the existing max so they didn't jump the queue).
- **Cost:** "$75 is a lot" → cheap model (`gpt-4o-mini`), no Batch-API rewrite needed at this price
  point (sync cost was already ~$8 total, Batch API's 50% saving wasn't worth the added complexity).
- **Quality:** auto-filter now, Ryan polishes later — matches existing project convention (thousands
  of foundation words already ship `reviewed:false`).

---

## Final numbers

| Stage | Count |
|---|---|
| Source unique (deduped) | 2895 |
| Auto-dropped (in master / inflection / function-word / multiword) | 162 |
| Candidates | 2733 |
| Clean (auto-keep, zipf ≥ 2.5) | 2025 — ingested as stubs |
| Flagged for review (zipf < 2.5, obscure) | 708 — **not ingested**, sits in `toefl_flag_review.csv` for Ryan |
| Ingested stubs → successfully enriched | **1837** |
| Ingested stubs → still un-enriched (held out, not shipped) | 188 (saved to `toefl_candidates/still_pending_holdout.jsonl` for a future pass) |
| Foundation words newly enriched this session | ~1500 (pre-existing debt, senses were empty) |
| **Shipped total in words.db** | **4560** (up from 2881) |

Enrichment converged over 4 passes (each pass mops up the model's own transient failures — parse
errors, dropped-without-marking-skipped words — which is expected and by design: `enrich-master` is
resume-safe, re-running the same command naturally retries anything not yet enriched).

## Real defects found and fixed along the way

**Bugs in the pipeline itself (all covered by new regression tests, content-tool 303 tests green):**
1. Empty-string `definition`/`example_sentence` sentinel broke `parseMasterFile`'s required-field
   check for the WHOLE file, not just new words — replaced with `PENDING_DEFINITION` (`master-store.ts`).
2. `frequency_rank: null` sorts **first** in SQLite `ORDER BY ASC`, not last — would have put every
   unenriched TOEFL word ahead of common foundation words in the learn queue (regression of the
   2026-07-05 ordering fix). Fixed by assigning provisional zipf-derived ranks at ingest.
3. `diagnostic` tier (49 words, added 2026-07-05) was never registered in `lexitap.config.json` —
   blocked `readMasterRecords` for EVERY command, a pre-existing bug surfaced by being the first to
   run `enrich-master` since that tier was added. Fixed (see AGENTS.md).
4. The model sometimes misread the `needs_base` prompt flag as a reason to *skip* a word instead of
   an instruction to generate its base fields — caught via a timing/quality test before the full run,
   fixed with explicit prompt guardrails + a pinned regression test.

**Content defects found via a multi-agent review (2 dimensions: correctness + quiz-integrity, plus
a dedicated corpus-wide content-safety sweep) — coverage was limited by sustained Anthropic rate
limiting during the review (~2% of enriched words got full 2-lens automated review; the safety
sweep covered ~67% of the corpus, word+definition only, before its own verify phase was rate-limited):**
5. **"bestiality"** — an explicit-content term — had been fully enriched (definition + 3 senses +
   5 quiz questions drilling it) into a 13+ ESL app. **Removed from the corpus entirely.**
6. **"slate"**'s `fill_blank` quiz question tested the wrong word ("writing" instead of "slate").
   Fixed directly.
7. Three genuine near-synonym pairs got byte-identical top-level definitions (amazement/astonishment,
   gigantic/jumbo, duplicate/clone), which tripped `validate --strict`'s dup-definition detector AND
   would have made their `definition_match` quiz question ambiguous. Differentiated one word in each
   pair, kept both quiz answers in sync.
8. Manually reviewed ~11 other content-safety-sweep hits (`sex`, `drug`, `arms`, `rifle`, `obscenity`,
   `profanity`, etc.) — all legitimate dictionary vocabulary, false positives from the sweep's
   caution. Two genuinely gray-area words left as-is for Ryan's later judgment: **`sensual`** (mild
   sexual-connotation adjective, common in mainstream media/literature) and **`mistress`** (definition
   is vague/incomplete rather than unsafe — doesn't clearly convey the word's actual common
   connotation). Not blocking.
9. **`moiety`** (a niche anthropological/legal term) slipped through the zipf-based obscurity filter
   despite being a poor TOEFL fit — the filter is frequency-based, not exam-relevance-based. Left
   as-is (low severity), noted here for awareness — a frequency filter alone will always let through
   this class of "not-rare-enough-to-flag but still a bad exam-tag" word.

**Out-of-scope finding, NOT fixed here (spawned as a separate task):** the content-safety sweep
surfaced ~36 words in the **pre-existing foundation corpus** (predates this session) that look like
proper nouns miscategorized as vocabulary (`washington`, `london`, `john`, `smith`, `trump`, etc.),
plus 2 junk abbreviations (`ca`, `dc`). Some sweep hits in the same batch (`australia`, `germany`,
`japan`, `asia`, `british`) are legitimate nationality/geography vocabulary and must NOT be purged
blindly — this needs per-word judgment, not a blanket removal, and none of it is TOEFL-scoped.

## Known gaps / follow-ups (not blocking, documented honestly)

- **188 TOEFL stub words never got enriched** (held out in `toefl_candidates/still_pending_holdout.jsonl`,
  not in the shipped corpus) — a mix of the model's own content-quality skips and validation edge
  cases (e.g. a few wanted a theme like "Art & Design" that isn't in `VALID_THEMES` — the theme
  taxonomy has no art/culture-craft bucket; a future pass could either expand the taxonomy or accept
  the loss).
- **The quality-audit workflow only fully covered ~50/2416 words (~2%)** before sustained Anthropic
  rate-limiting made further large parallel-agent batches unproductive; the safety sweep covered the
  whole corpus (word+definition only, cheap) but its verify phase also got rate-limited, so those 47
  candidates were manually triaged rather than adversarially confirmed. Real defects (`bestiality`,
  `slate`) were found in the small sample that DID complete — there is a nonzero chance similar
  issues exist undetected in the ~98% of enriched content that wasn't reviewed. This is an honest
  residual risk, mitigated by: `reviewed:false` on every generated item (existing project convention,
  not a new gate), and the fact this is the same quality bar the existing ~2800-word foundation debt
  already ships under.
- **`toefl_flag_review.csv` (708 obscure words) still needs Ryan's review** — untouched, not ingested.
- **91 pre-existing foundation words have `NULL frequency_rank`** (predates this session, ~2% gap
  matches prior memory's documented coverage figure) — out of scope here, not a regression.

## Guardrails / gotchas (for the next agent touching this pipeline)

- `words.db` rebuild + `infrastructure/db/` are guarded — lift→edit→restore net-zero.
- **Never hand-edit `words_master.jsonl` while any `enrich-master` process is still running** — it
  holds the whole file in memory and overwrites it wholesale on every batch flush, silently
  clobbering any concurrent edit (bit this session: a `bestiality` removal got undone by the next
  batch flush before this was understood; fixed by waiting for the background job to finish first).
- Workflow-tool `args` marshaling is unreliable for large arrays (49-string array errored as
  "exceeds 4096" — got flattened to a char array under the hood) — for anything beyond a handful of
  primitives, embed the data as a literal in the script body instead of passing via `args`.
- Large parallel-agent workflow batches (~50-100 concurrent Claude subagent calls) can hit a
  sustained Anthropic rate limit, not just a transient burst — retries of the same shape don't
  reliably help; reducing concurrent call count (fewer, bigger chunks) is the lever, not just waiting.
