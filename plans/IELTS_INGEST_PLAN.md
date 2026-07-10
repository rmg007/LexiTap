# IELTS 3000 Ingest + Enrichment Plan

**Status:** draft (2026-07-10) — pending Ryan's accept.
**Goal:** add real IELTS exam vocabulary coverage to the app — tag the words we already teach as
IELTS-relevant, and enrich the ones we don't have yet (definition/senses/quiz) so they're actually
learnable, not just rows in a table.
**Mirrors:** [`plans/TOEFL_INGEST_PLAN.md`](TOEFL_INGEST_PLAN.md) (done 2026-07-06) — same pipeline,
same commands, same gotchas already paid for once.

---

## Source data (checked this session)

- `/Users/ryan/Desktop/IELTS Vocab/IELTS_Vocabulary_3000_1.xlsx` — **the only file that matters.**
  Sheet `Vocabulary`: 3000 unique words, columns `Word | CEFR Level (B2/C1/C2) | Batch (1-15) | Tier
  (Core=batches 1-10 / Extended=batches 11-15)`. Bare word list — no definitions/senses/quiz, same
  shape as the TOEFL raw input before enrichment.
- `IELTS_Vocabulary_3000_2.xlsx` — **redundant, ignore entirely.** Verified byte-for-byte: its 2000
  words are exactly file1's Core tier (batches 1-10), just missing the `Tier` column. Not a second
  source, not additional signal.
- Cross-checked file1 against [`content-tool/data/input/words_master.jsonl`](../content-tool/data/input/words_master.jsonl)
  (4332 words, current as of this session):
  - **683 already exist** in the master (full content already shipped).
  - **2317 are net-new** — 1317 Core-tier, ~1000 Extended-tier (exact split TBD in Phase 0, see below).

## Decisions (Ryan, 2026-07-10)

- Overlap (683 words): **tag, don't re-enrich** — add `ielts` to the existing word's `categories`
  array. Same cross-reference-only move TOEFL used for its specialty-tier pass.
- Overlap CEFR backfill: if an existing overlap word has **no `cefr_level`** set, backfill it from
  the source file's `CEFR Level` column (closes real coverage debt — see Risks). If it already has
  one and the source file disagrees, don't silently overwrite — flag to `ielts_flag_review` instead.
- Scope: **both Core and Extended** tiers of the 2317 net-new words, in one ingest — tagged so
  Core vs Extended stays filterable later (Extended is the source file's own "lower-frequency,
  less exam-specific" bucket; not excluding it, just not hiding the distinction).
- Enrichment model: **`gpt-4o-mini`**, same as TOEFL's ~$8/1837-word run. No batch-API rewrite —
  TOEFL proved sync cost is already trivial at this volume.

## Decisions needed from Ryan

- **None blocking Phase 1–3.** One checkpoint before spend (Phase 4 gate, below) — confirm word
  count + estimated cost before the paid enrichment run actually fires, same as TOEFL's practice.

---

## Core design principle — additive tagging, not a schema change

`ielts` is **already a registered tier** in
[`content-tool/lexitap.config.json`](../content-tool/lexitap.config.json) (slug `ielts`, `is_free:
false`, `sku: com.lexitap.exam.ielts`) — unlike TOEFL, which hit a real pre-existing bug (`diagnostic`
tier unregistered, blocked the whole pipeline). **No such landmine here** — worth confirming again
right before the ingest command runs, in case anything changed since this session, but nothing to
fix going in.

The only schema addition this plan needs: register **`ielts-extended`** as a new tier slug in
`lexitap.config.json` (mirrors `toefl`'s config shape — `is_free: false`, same or a bundled SKU,
next `display_order`). Everything else is existing machinery:
- `categories` is a flat array of CEFR level + tier slugs (see `tiersOf`/`composeCategories` in
  [`content-tool/src/commands/master-store.ts`](../content-tool/src/commands/master-store.ts)) — no
  new fields, no new tables, no `user.db` migration. Same additive shape as every prior tier.
- New words are stub records (`PENDING_DEFINITION` sentinel) ingested into `words_master.jsonl`,
  then run through `enrich-master` — the exact TOEFL recipe, reusing `import-master`'s existing
  base-field generation path.

`domain/srs` and `infrastructure/db/` are untouched by *this* plan except the standard guarded,
lift→edit→restore `words.db` rebuild at the end (same as every content release).

## Out of scope

- Re-enriching or reviewing the 683 already-shipped words beyond adding the `ielts` tag — their
  existing definitions/senses/quiz stand as-is.
- The `toefl_flag_review.csv` 708-word backlog from the TOEFL session — unrelated, not touched here.
- Building an `ielts-extended`-aware UI filter/paywall distinction — tagging only; whether the app
  surfaces Core vs Extended differently is a separate product decision, not blocked by this plan.
- Any new specialty-tier taxonomy work (GRE/GMAT/business are pre-existing empty tiers, not this
  plan's job to populate).

---

## Phases

### Phase 0 — Dedup + normalize (offline, free, already substantially done)

1. Re-run the load+lemmatize+cross-reference used this session as a reproducible script (not just an
   interactive check) — save to `content-tool/data/input/ielts_candidates/` mirroring the TOEFL
   layout (`toefl_candidates/`): `ielts_clean.json` (net-new, auto-keep), `ielts_overlap.json` (683
   words + which existing master `word_id` they map to + source `Batch`/`CEFR Level`/`Tier`, for the
   tagging + CEFR-backfill pass).
2. Confirm no additional junk this list needs filtering for (TOEFL's zipf/obscurity filter existed
   because that source had ~26% junk; this file is curated/leveled B2-C1-C2 already — expect the
   junk rate to be near zero, but don't skip the check: run the same lemmatize + already-in-master +
   multiword-phrase filter TOEFL used, log counts, don't assume clean).
3. Split net-new words by `Tier` column into Core (1317ish) vs Extended (~1000ish) — exact counts
   land here, not guessed.
**Done means:** `ielts_clean.json` (net-new, tier-split) + `ielts_overlap.json` (683 existing word_ids)
exist on disk, counts logged, no `words_master.jsonl` write yet.

### Phase 1 — Tag the 683 overlaps

1. Register `ielts-extended` tier slug in [`lexitap.config.json`](../content-tool/lexitap.config.json)
   (config-only change, additive — new tiers array entry).
2. For each of the 683 overlap words, add `ielts` to its `categories` array via
   `composeCategories`/`tiersOf` (existing helpers in `master-store.ts`) — a targeted rewrite of
   `words_master.jsonl`, not a new command; reuse `categorize`'s tag-mutation pattern
   ([`content-tool/src/commands/categorize.ts`](../content-tool/src/commands/categorize.ts)) or write
   a small one-off script that loads records, mutates only the 683 matched by word, re-serializes.
   Also add `ielts-extended` for any overlap whose source `Batch` is 11-15 (Core/Extended
   distinction applies to overlaps too, not just net-new — see Risks).
3. Same pass: backfill `cefr_level` on any overlap word that has none set, from the source file's
   `CEFR Level` column. If the word already has a `cefr_level` and it conflicts with the source
   file's value, don't overwrite — write it to `ielts_flag_review` for Ryan instead.
4. `npm run cli -- validate --strict` — confirm 0 errors, same warning baseline as before (no
   regressions on words untouched by this pass).
**Done means:** `content-tool npm run check` GREEN; `words_master.jsonl` diff touches exactly 683
existing records' `categories` field (+ `cefr_level` where backfilled), nothing else. Log: how many
of the 683 got a CEFR backfill vs already had one vs conflicted.

### Phase 2 — Ingest the 2317 net-new words as stubs

1. Append 2317 new records to `words_master.jsonl` using the same stub shape TOEFL used:
   `definition: PENDING_DEFINITION`, `example_sentence: PENDING_EXAMPLE_SENTENCE`, `categories:
   [cefr_level, 'ielts']` (+ `'ielts-extended'` for the Extended-tier subset). Set both:
   - `frequency_rank`: bucket by CEFR level (B2/C1/C2) into a rank range consistent with existing
     words at that level — never `null` (TOEFL's ordering-footgun fix, see Risks below).
   - `difficulty`: derive from the same CEFR level, never `null`. This field is the *actual*
     learn-batch sort key (`difficulty ASC, frequency_rank ASC` per
     [memory/2026-07-05_learn-batch-ordering.md](../memory/2026-07-05_learn-batch-ordering.md)) —
     it was chosen over `frequency_rank`/`cefr_level` specifically for 100% coverage on existing
     words. Leaving it null on 2317 new words reintroduces the same null-sorts-first bug on a
     different column.
2. `validate --strict` — confirm stubs parse cleanly (required-field check passes on the sentinel,
   same as TOEFL).
**Done means:** master file has 4332 + 2317 = 6649 total lines, `content-tool npm run check` GREEN,
no `words.db` rebuild yet (stubs aren't ready to ship — no content).

### Phase 3 — Content-quality pre-screen (before spending money)

Same lesson TOEFL's own review learned the hard way: cheap automated screens catch different things
than a full review, and coverage is honestly bounded by rate limits — say so, don't oversell it.

1. Run the same corpus-wide safety-term sweep TOEFL used (explicit-content terms, proper-noun
   patterns) against the 2317 new words BEFORE paying for enrichment — cheaper to drop a bad word
   pre-spend than post-spend (TOEFL's `moiety`/`bestiality` lesson).
2. Spot-check a ~20-word sample per tier (Core + Extended) for source-list quality the way the
   Rich-Word-Detail session did before its real enrichment run — confirms the list isn't hiding
   inflections/proper-nouns/multiword entries that Phase 0's mechanical filter might've missed.
**Done means:** flagged-word list (if any) removed from the Phase 2 stub set or routed to a
`ielts_flag_review` file for Ryan, same non-blocking pattern as `toefl_flag_review.csv`.

### Phase 4 — Paid enrichment run (Ryan checkpoint before this fires)

**Gate: confirm final word count + estimate cost with Ryan before running.** TOEFL was ~$8 for 1837
words on `gpt-4o-mini`; at ~2317 words (minus anything Phase 3 dropped) expect a similar per-word
rate — say the number out loud before spending, don't just run it.

1. `npm run cli -- enrich-master --limit <n>` in the resume-safe passes TOEFL used (batch, don't
   try to do 2317 in one call) — generates base fields (pos/definition/example_sentence/theme) +
   felt senses + 5 quiz questions per word.
2. Iterate to convergence (TOEFL took ~4 passes to mop up transient parse failures) — resume-safe,
   re-running is expected, not a bug.
3. **Never hand-edit `words_master.jsonl` while `enrich-master` runs in the background** — it holds
   the whole file in memory, clobbers concurrent edits on flush (bit the TOEFL session twice).
**Done means:** all non-dropped Core+Extended words have real `definition`/`pos`/`example_sentence`/
senses/questions (no `PENDING_DEFINITION` sentinel left among words Ryan wants shipped).

### Phase 5 — Post-enrichment review (don't skip, same as TOEFL)

1. Multi-agent review pass across the newly-enriched words: correctness (definition matches word),
   quiz-integrity (fill-blank targets the right word, no duplicate-definition near-synonym pairs),
   content-safety sweep (explicit terms, proper nouns that slipped through Phase 3).
2. Fix confirmed defects directly in `words_master.jsonl`; log anything left as an honest residual
   risk (TOEFL's `sensual`/`mistress`/`moiety` precedent — gray-area or low-severity items don't
   block, but get named, not buried).
**Done means:** review findings triaged (fixed or explicitly deferred with a one-line reason), not
just reported and dropped.

### Phase 6 — Release: rebuild `words.db`, ship

1. `npm run cli -- release` (or the `--no-copy` variant to inspect before copying) — bumps
   `user_version`, rebuilds the bundled read-only DB from `working.db`.
2. `validate --strict` on the fresh DB — 0 errors (warnings-only baseline, matches existing
   `theme:'General'` debt, not a new regression).
3. Copy to `mobile/assets/vocab/words.db` (guarded path — lift→edit→restore net-zero, standard
   content-tool release step).
4. `content-tool npm run check` + `mobile npm run check` both GREEN.
**Done means:** shipped `words.db` has 6649-ish words (4332 existing + 2317 new, minus any Phase-3/5
drops), `ielts` + `ielts-extended` tiers populated and queryable, both test suites green.

---

## Risks / gotchas

- **`frequency_rank: null` sorts first in SQLite `ASC`** — the TOEFL regression. Every new stub in
  Phase 2 must get a provisional CEFR-bucketed rank, never `null`, or these words queue-jump ahead
  of common foundation vocabulary in the learn flow.
- **Same null-sorts-first bug applies to `difficulty`, the actual learn-batch sort key** — new stubs
  must get a CEFR-derived `difficulty` too, not just `frequency_rank` (see Phase 2). Missed once
  already on `cefr_level` itself (2% coverage, per 2026-07-05 memory) — don't repeat it on a second
  column in the same ingest.
- **Overlap words need Core/Extended tagging too, not just net-new** — the 683 overlaps came from
  the same source file's Batch column; an overlap word from an Extended batch (11-15) needs
  `ielts-extended` alongside `ielts`, same as a net-new Extended word would.
- **`import-master`/`enrich-master` load the whole `words_master.jsonl` into memory and rewrite it
  wholesale on flush** — no hand-edits while either runs, no concurrent sessions touching the same
  file (the 2026-07-09 sessions' `import-master` prune-fix note documents this collision class).
- **Tier registration must happen before any command touches the new tier slug** — `ielts` is
  already registered (checked this session), but `ielts-extended` is not yet; Phase 1 step 1 must
  land before Phase 2 appends any record carrying that category, or every subsequent
  `readMasterRecords` call throws (this is exactly the bug class that blocked TOEFL's `diagnostic`
  tier for a month).
- **`import-master` now prunes** (2026-07-09 fix) — any active `words` row absent from the imported
  master set gets soft-deleted on the next full import. Not a risk to *this* plan (we're adding, not
  removing) but worth knowing: don't run a partial/filtered master file through `import-master`
  without `--no-prune` if this ingest is interleaved with any other concurrent content session.
- **Concurrency:** if another session is mid-flight on `words_master.jsonl` (content sessions have
  collided twice in the last week per memory), coordinate before Phase 1 starts — same file, same
  collision risk as documented in `memory/2026-07-09_*.md`.
- **Multi-agent review coverage is rate-limit-bounded, historically** — TOEFL's review only fully
  covered ~2% of enriched words before Anthropic rate limits degraded further batches. State the
  actual coverage achieved in Phase 5, don't imply full coverage if it wasn't.

## Docs to update on completion

- **`memory/MEMORY.md`** — new session entry mirroring the TOEFL one: final counts, model+cost,
  defects found/fixed, honest residual risk.
- **`content-tool/AGENTS.md`** — only if this run surfaces a new pipeline invariant/bug (as TOEFL's
  did, 4 times); if the run is clean, no doc change needed there.
- **`ROADMAP.md`** — if IELTS content was tracked as a backlog line item, flip it; if not tracked,
  no change.
- **`lexitap.config.json` is itself the doc** for the new `ielts-extended` tier — no separate
  narrative doc needed beyond the memory note.
