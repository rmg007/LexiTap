# Session: Foundation CEFR Backfill — Phase 1 done (2026-07-10)

**Plan:** [`plans/FOUNDATION_ELIMINATION_PLAN.md`](../plans/FOUNDATION_ELIMINATION_PLAN.md)

## What was done

Backfilled CEFR levels on the 2,038 foundation-only (no other tier) words that had no CEFR
classification — closing the debt noted since the 2026-06-10 JSONL pipeline session where the
categorize bulk run was held. Phase 2 (Most Common 3000) remains blocked on Ryan sourcing a real
frequency list.

## Numbers

| Metric | Before | After |
|---|---|---|
| foundation-only words with no CEFR | 2,038 | **0** |
| foundation words with CEFR | 582 | **2,620** (100%) |
| `words.db` user_version | 7 | **8** |
| Total words in corpus | 6,566 | 6,566 (unchanged) |

## Run details

- **30-word sample gate** passed first — CEFR assignments correct; `see → C2` flagged as suspicious
  but verified correct (definition is "bishop's diocese", not the vision verb).
- **Bulk run**: `categorize --tier foundation --limit 2620 --model gpt-4.1-mini`; 2,588/2,590
  categorized in 13 chunks of 200, ~$0.25 total. 2 words missed by the model.
- **Adversarial spot-check** (94 words — all 34 C1/C2 + 60 sampled from A2–B2): 7 confirmed
  misassignments fixed:
  - `engineer` C1 → A2 (common profession word)
  - `ii` C2 → A1 (Roman numeral 2)
  - `patent` C2 → B2 (business English B2)
  - `submit` C1 → B1 (AWL core, B1 range)
  - `hence` C1 → B2 (discourse connective)
  - `significantly` C1 → B2 (academic adverb, Oxford 5000 B2)
  - `expect` A2 → B1 (Cambridge classifies this B1)
- **2 model-missed words** fixed manually:
  - `great` (noun: "the greats of jazz") → B2
  - `il` (French pronoun in English corpus) → C1
- **Pipeline**: `import-master` → `validate --strict` → `release` — 0 errors, 2,574 warnings
  (known `theme:'General'` debt, unchanged).

## Final CEFR distribution (foundation words only)

| Level | Count |
|---|---|
| A1 | 650 |
| A2 | 561 |
| B1 | 604 |
| B2 | 772 |
| C1 | 27 |
| C2 | 7 |

Distribution is a healthy A1→B2 bell curve with 34 C1/C2 total — all verified legitimate
(specialized definitions, not the common surface-form meanings).

## Tests

content-tool 308/308 ✓ · mobile 617/617 ✓

## Follow-up items (not this session's scope)

- **`cefr_level` ordering in learn batch**: `selectNewWords` in
  [`wordQueries.ts`](../mobile/src/infrastructure/db/queries/wordQueries.ts) previously avoided
  `cefr_level` ordering because only 2% of foundation was labelled. Coverage is now 100% — revisit
  whether CEFR-band ordering is better than `difficulty` ordering for the learn queue (separate
  task, see AGENTS.md note).
- **Phase 2 (common3k)**: blocked on Ryan sourcing a real frequency list (Oxford 3000 / NGSL /
  similar). Plan file documents what to do once the list is sourced.
- **`theme: 'General'` backfill**: 2,574 warnings, separate known debt item, unchanged.
- **`lexitap.config.json` vs `tiers.ts` foundation free/paid discrepancy**: noted in plan file as
  pre-existing, not caused by this session — worth a small follow-up to reconcile.
