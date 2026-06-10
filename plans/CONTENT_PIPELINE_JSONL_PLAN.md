# Content Pipeline JSONL Redesign Plan

**Status:** approved — pending implementation  
**Decision date:** 2026-06-10  
**Supersedes:** separate-CSV-per-tier approach (foundation.csv, toefl.csv, etc.)  
**Blocked by:** nothing — implement before CONTENT-2 enrichment run  

---

## Why

The CSV-per-tier structure has three hard failures:

1. **Can't represent nested data.** Each word may have multiple senses; each sense has multiple examples. A flat CSV cannot express this — you'd need either duplicate rows or encoded JSON blobs in a cell.
2. **Multi-tier membership requires file duplication.** A word that belongs to `foundation` + `toefl` + `ielts` must appear in three separate CSVs, kept in sync manually. That's already wrong: the specialty CSVs were stubs (5–10 words each) precisely because nobody wanted to maintain the duplication.
3. **CEFR and tier are the same kind of thing.** Both are category labels on a word. Splitting them across two columns (`cefr_level` + `tier`) and across multiple files added accidental complexity.

---

## Decisions (this session, 2026-06-10)

| Decision | Detail |
|---|---|
| Drop all CSV input files | `foundation.csv`, `toefl.csv`, `ielts.csv`, `gre.csv`, `gmat.csv`, `business.csv`, `advanced.csv`, `common9k.csv`, `common3k.csv`, `foundation-3k.csv`, `foundation_3000.csv` are superseded |
| Single master file: `words_master.jsonl` | One JSON object per line, one line per word. Lives at `content-tool/data/input/words_master.jsonl` |
| Merge `cefr_level` + `tiers` → `categories` array | One array contains everything: CEFR level + all tier slugs. Parser routes A1/A2/B1/B2/C1/C2 → `words.cefr_level`; everything else → `word_tiers` rows |
| Add `reviewed` boolean | Per word, in both JSONL (`"reviewed": false`) and DB (`words.reviewed INTEGER DEFAULT 0`). Toggleable — Ryan marks a word reviewed after checking definition, senses, questions, audio |
| Senses live inside the master file | `"senses": []` for un-enriched words; populated by the enrichment run in-place |
| No new words for now | 2,848 foundation words is the scope. Seeding is expensive (explanation + examples per sense + ~20–30 questions + audio + maybe images/video). Don't expand until existing words are fully seeded |
| Cross-reference specialty tiers against foundation | Don't add new words — identify which of the 2,848 foundation words also belong to TOEFL, IELTS, GRE, GMAT, business, advanced, common9k, and add those categories to their entries |

---

## Master JSONL Schema (per word)

```jsonc
{
  // Required
  "word": "negotiate",
  "pos": "verb",
  "categories": ["B2", "foundation", "business", "ielts"],  // CEFR level + all tiers
  "reviewed": false,
  "definition": "To discuss something in order to reach an agreement",
  "example_sentence": "They met to _ the terms of the new contract.",  // cloze blank = _

  // Optional
  "frequency_rank": 1842,
  "word_type": "vocabulary",    // vocabulary | expression | idiom | phrasal_verb
  "difficulty": 3,              // 1–5
  "theme": "Work & Career",
  "synonyms": ["bargain", "discuss"],
  "antonyms": [],
  "usage_notes": null,
  "image_path": null,
  "audio_path": null,

  // Rich senses — [] until enriched
  "senses": [
    {
      "sense_index": 0,
      "pos": "verb",
      "short_gloss": "to discuss to reach an agreement",
      "explanation": "When you negotiate, you have a serious back-and-forth conversation where both sides want something...",
      "image_path": null,
      "examples": [
        "The union negotiated a higher wage for all workers.",
        "She negotiated the price down from $500 to $350.",
        "Both countries agreed to negotiate a peace deal."
      ]
    }
  ]
}
```

### `categories` parsing rules (import pipeline)

| Value | Routes to |
|---|---|
| `A1`, `A2`, `B1`, `B2`, `C1`, `C2` | `words.cefr_level` (first CEFR value wins; warn if >1) |
| `foundation`, `toefl`, `ielts`, `gre`, `gmat`, `business`, `advanced`, `common9k`, `common3k` | one `word_tiers` row per slug |
| anything else | hard error at import time |

---

## DB Schema Changes

### `words` table — add `reviewed` column

```sql
ALTER TABLE words ADD COLUMN reviewed INTEGER NOT NULL DEFAULT 0;
```

Add to `ddl.ts` `CREATE_WORDS`. Also add index for efficient QA queries:

```sql
CREATE INDEX idx_words_reviewed ON words(reviewed) WHERE deleted_at IS NULL;
```

### No other schema changes

`word_tiers`, `word_senses`, `sense_examples` are unchanged. The JSONL import populates all of them.

---

## Pipeline Changes

### Commands that change

| Command | Before | After |
|---|---|---|
| `import` | reads CSV, takes `--tier` flag, populates `words` + `word_tiers` | reads JSONL master, no `--tier` flag needed, populates `words` + `word_tiers` + `words.reviewed` |
| `ingest-senses` | reads `senses-enriched.jsonl`, populates `word_senses` + `sense_examples` | **merged into `import`** — senses in master JSONL are ingested in the same pass |
| `enrich-senses` | outputs to separate `senses-enriched.jsonl` | outputs back into `words_master.jsonl` (updates `senses` array in-place per word) |

### Commands that stay the same

`validate`, `release`, `export`, `enrich` (definition enrichment) — unchanged.

### New command: `export-master`

Exports current working DB state back to `words_master.jsonl` (for round-tripping: DB → JSONL → edit → re-import). Useful for bulk edits via a text editor or spreadsheet tool that can handle JSONL.

---

## Migration: existing working.db → words_master.jsonl

One-time script (run once, then the JSONL is the source of truth):

1. `SELECT w.*, GROUP_CONCAT(wt.tier_id) FROM words w LEFT JOIN word_tiers wt ON w.id = wt.word_id WHERE w.deleted_at IS NULL GROUP BY w.id ORDER BY w.frequency_rank`
2. For each row, fetch senses + examples from `word_senses` + `sense_examples`
3. Build `categories` array: cefr_level first (if set), then all tier slugs
4. Set `reviewed: false` for all (no word has been manually reviewed yet)
5. Write one JSON line per word to `data/input/words_master.jsonl`

This migration script lives at `content-tool/src/commands/export-master.ts` and is a one-off — run it once to bootstrap the JSONL, then retire it.

---

## Cross-referencing Specialty Tiers

The 2,848 foundation words need to be audited against TOEFL, IELTS, GRE, GMAT, business, advanced, common9k word lists to identify overlaps. Process:

1. Source authoritative word lists for each specialty tier (see below)
2. Normalize to lowercase, match against foundation words by surface form
3. For each match, add the specialty tier slug to that word's `categories` array in `words_master.jsonl`
4. Re-import → new `word_tiers` rows created, no words added, no content changed

**Source recommendations:**
| Tier | Recommended source |
|---|---|
| `toefl` | ETS Official TOEFL Vocabulary List (public PDF) |
| `ielts` | IELTS Vocabulary List (British Council / Cambridge) |
| `gre` | Magoosh GRE Top 1000 (open) |
| `gmat` | GMAT Official Verbal Review word list |
| `business` | Oxford Business English Dictionary top 500 |
| `advanced` | Oxford 5000 B2–C2 extension list |
| `common9k` | New General Service List (NGSL) 9k extension |

Ryan to provide or approve sources. This is a content task, not a code task.

---

## Implementation Phases

### Phase 1 — Schema + migration (no enrichment yet)
- [ ] Add `reviewed` column to `ddl.ts` + `CREATE_WORDS`
- [ ] Add `reviewed` to `WordRow` type in `schema/types.ts`
- [ ] Write `export-master` command (DB → JSONL bootstrap)
- [ ] Run migration: generate `data/input/words_master.jsonl` from current working.db
- [ ] Verify JSONL has all 2,848 words, correct categories, `senses: []` or existing senses

### Phase 2 — Import pipeline rewrite
- [ ] Update `csv.ts` / `import.ts` to read JSONL master (drop `--tier` flag)
- [ ] Parse `categories` array → route CEFR + tier slugs correctly
- [ ] Merge `ingest-senses` logic into `import` (senses ingested in same pass)
- [ ] Update `enrich-senses` output to write back to master JSONL
- [ ] All existing tests green; add tests for JSONL import + categories parsing

### Phase 3 — Cross-reference specialty tiers
- [ ] Source word lists for each specialty tier (Ryan to approve)
- [ ] Write cross-reference script: match foundation words → add tier slugs to JSONL
- [ ] Re-import; verify `word_tiers` counts are realistic

### Phase 4 — CONTENT-2 enrichment run
- [ ] Run `npm run enrich:senses -- --limit 300 --model claude-opus-4-8`
- [ ] Enrichment writes senses back into `words_master.jsonl`
- [ ] Re-import; validate; release

---

## Files Superseded (do not use, do not re-import)

These files are kept in `data/input/` as historical reference but must not be used as import sources once Phase 1 is complete:

- `foundation.csv`, `foundation-200-original.csv`, `foundation-3k.csv`, `foundation_3000.csv`
- `toefl.csv`, `ielts.csv`, `gre.csv`, `gmat.csv`, `business.csv`, `advanced.csv`
- `common9k.csv`, `common3k.csv`

Move to `data/input/archive/` after Phase 1 to prevent accidental re-use.

---

*Created: 2026-06-10. Owner: content pipeline agent. Unblock: implement Phase 1–2 before any enrichment run.*
