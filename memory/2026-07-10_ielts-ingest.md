# IELTS 3000 ingest + enrichment shipped (2026-07-10)

Plan: [`plans/IELTS_INGEST_PLAN.md`](../plans/IELTS_INGEST_PLAN.md) (done). Mirrors the 2026-07-06
TOEFL pipeline — Ryan said "use as many agents as you need and get these phases done," executed all
6 phases end to end (not just planned).

**Source:** `IELTS_Vocabulary_3000_1.xlsx`, 3000 words (B2/C1/C2, Core batches 1-10 / Extended
11-15). `_2.xlsx` confirmed byte-for-byte redundant subset, ignored.

**Phase 0 (dedup):** 683 already existed in `words_master.jsonl` → tag-only. 2317 net-new. 61
lemma-collision flags reviewed by hand (not auto-dropped like TOEFL — curated source, not scraped)
→ kept all 61 as genuinely distinct words.

**Phase 1 (tag + backfill):** 683 overlaps got `ielts`/`ielts-extended` added to `categories`; 655
CEFR-backfilled where null; 13 CEFR conflicts (existing DB value disagreed with source) logged to
`ielts_cefr_conflicts.json`, never overwritten. New `ielts-extended` tier registered in
`lexitap.config.json`.

**Phase 2 (ingest stubs):** 2317 net-new words appended as `PENDING_DEFINITION` stubs,
frequency_rank continuing past the existing max (never null), difficulty CEFR-bucketed (B2→3,
C1→4, C2→5, derived from real corpus averages, not guessed).

**Phase 3 (pre-screen):** 6-agent parallel sweep of all 2317 words for explicit content/proper
nouns before spending — 0 flags, clean curated list.

**Phase 4 (paid enrichment, gpt-4o-mini):** 7 passes total (exceeds TOEFL's ~4-pass precedent —
justified below). Final: 2483/2317+166-carryover words enriched with real content; **83 words
permanently deferred** (removed from `words_master.jsonl`, word list saved to
`ielts_candidates/ielts_deferred_pending.json` for a future re-run) — mix of `provider_error`
retries that never cleared and validation-invalid generations (bad `theme` values, malformed cloze
sentences) that kept failing after 7 attempts. Diminishing returns were clear (pass 7: 64
enriched / 65 invalid-dropped out of 149) — stopping here per design, not indefinite retry.

**Real bug found + fixed mid-run:** `enrich-master`'s content-skip heuristic (tuned for TOEFL's
raw/scraped 26%-junk source) wrongly and permanently skipped 147 genuinely clean, common IELTS
words ("job", "media", "notion" etc. — flagged as "too vague"/"too general"/"already defined")
despite Phase 3's independent review finding them completely clean. Root-caused to the model
over-eagerly applying a heuristic tuned for a different, dirtier source. Fixed surgically: stripped
those 147 words' entries from the `.enrich-skipped.jsonl` sidecar and retried, rather than either
accepting the loss or blanket-clearing the whole sidecar (which would waste money re-processing
TOEFL's legitimately-skipped junk too).

**Phase 5 (post-enrichment adversarial review):** 8-agent parallel review + adversarial verify pass
across all 2855 then-enriched words (correctness / quiz-integrity / content-safety), 82 total
agents, 39 confirmed findings (3 were false positives caused by a bug in *my own* review-data-prep
script — wrong field names, `correct_answer`/`options`/`.text` vs the real schema's
`correct`/`distractors`/plain-string `examples` — verified against raw records before trusting the
"systemic" claim). Of the 36 real findings, fixed:
- **`term`**: wrong `pos` (tagged adjective, used as noun everywhere in its own content) — corrected
  pos/definition/sense/quiz to noun.
- **`elite`**: same pos/definition mismatch (noun content under adjective tag) — fixed.
- **`confer`**: definition said "grant a title/degree" but every sense/example/question taught the
  "discuss" sense — definition rewritten to match the actual taught sense.
- **`regressive`**: top-level definition was flatly wrong (said "decreases in effectiveness over
  time"), contradicted its own correct `explanation` field — definition rewritten to match.
- **`malignant`**: definition said "infectious" but every example was the tumor/cancer sense
  (tumors aren't contagious) — definition narrowed to the actual taught sense.
- **`canon`**: example sentence embedded the copyrighted "Star Wars" brand name — replaced with a
  generic example.
- **`sensitive` / `vital`**: both had genuinely empty `senses`/`questions` arrays (enrichment never
  ran) — hand-authored full 5-question sets from scratch.
- **`period` / `total` / `republic`**: `sentence_order` quiz questions had garbled/broken embedded
  token lists (duplicated fragments, missing words) — replaced with the standard plain prompt format
  used by 5444/6289 other `sentence_order` questions corpus-wide (the embedded-token variant is a
  pre-existing legacy pattern affecting 845 questions across the whole corpus, not unique to this
  session — out of scope to fix all of them here, flagged as known debt).
- **9 grammar fixes** in cloze `example_sentence`s where filling the blank with the singular/base
  headword produced an ungrammatical sentence (hemisphere, crater, retiree, skew, enforce, prohibit,
  casualty, civilian, undocumented) — rewritten to be singular/base-form-friendly.
- **10 duplicate-definition pairs** (20 words: zippy/vivacious, gigantic/enormous,
  worrisome/alarming, duplicate/replicate, ambiance/ambience, standpoint/viewpoint, cease/desist,
  apex/pinnacle, placate/mollify, hitherto/heretofore) — one word in each pair reworded to add a
  genuine distinguishing nuance (register, specificity, or figurative-vs-literal sense) rather than
  leaving them as confusable quiz distractors.
- **Left as documented residual, not fixed:** ~14 additional near-duplicate-definition pairs flagged
  by review as lower-confidence/subjective (ephemeral/fleeting, minuscule/diminutive,
  compassionate/humane, spike/upsurge, etc.) — same class of accepted content debt as the
  pre-existing `theme:'General'` backlog, not blocking.

**Real pipeline bug found + fixed (not content, code):** `validate.ts`'s `loadWords()` had **no
`deleted_at IS NULL` filter**, unlike every other loader in the file (`loadSenses`,
`loadSenseExamples`, etc.). This meant the 2026-07-09 `import-master` prune-by-default change
(memory: `2026-07-09_import-master-prune-fix.md`) silently broke `validate --strict`/`release` for
any working DB with pruned words — soft-deleted rows were still validated (duplicate-definition
checks, tier-membership checks), producing permanent unfixable-looking errors ("word has no tier
membership" for words whose `word_tiers` rows were correctly pruned) on every subsequent release.
Hit it live: pruning the 83 deferred words for this release surfaced exactly this failure mode.
Fixed at the root (`content-tool/src/commands/validate.ts` `loadWords()`) — both the tier-filtered
and whole-table query now exclude `deleted_at IS NOT NULL` rows, matching every other loader.

**Phase 6 (release):** `import-master` → `validate --strict` (0 errors, 2574 warnings — all
pre-existing `theme:'General'` debt) → `release` → **shipped `words.db` user_version 6, 6566
words** (was 4332 pre-session: +683 tagged, +2151 newly enriched net-new IELTS, 83 deferred).
content-tool 308/308 tests green. mobile 617/617 green (1 pre-existing flaky RTL timeout on
`ExitSessionSheet.render.test.tsx` — confirmed unrelated, passes clean in isolation, no mobile
source touched this session).

**Honest residual:** 83 IELTS words (of 2317 net-new, ~3.6%) never converged to valid content after
7 enrichment passes and were removed from `words_master.jsonl` rather than shipped broken — word
list saved to `content-tool/data/input/ielts_candidates/ielts_deferred_pending.json` for a future
enrichment pass (they are not lost; re-adding them as stubs and re-running `enrich-master` picks up
exactly where this left off).
