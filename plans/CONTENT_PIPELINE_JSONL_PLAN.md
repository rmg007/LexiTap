# Content Pipeline JSONL Redesign Plan

**Status:** Phases 1–4 CODE-COMPLETE + tested. **Bulk seeding deliberately DEFERRED** — per-word LLM calls do not scale to 2,848 words (see "Why deferred" below).  
**Decision date:** 2026-06-10  
**Blocked by:** nothing for code. The bulk *run* is on hold by Ryan's call — the per-word approach is too slow/costly for the full set; a cheaper bulk strategy is needed before seeding everything.  

> **2026-06-10 update — Phases 3 & 4 built on OpenAI; bulk run held.** The Anthropic `enrich-senses` driver had no key, so both phases were implemented against the project's `OPENAI_API_KEY`:
> - **Phase 3** = `categorize` command + `OpenAiCategorizeProvider`: model assigns CEFR (closing the legacy `foundation.csv` CEFR debt) + specialty tiers (toefl/ielts/gre/gmat/business/advanced/common9k/common3k), merged into `categories` in place. Replaces the "source seven external word lists" task.
> - **Phase 4** = `enrich-master` command + `OpenAiSenseQuestionProvider`: per word, felt senses + examples AND exactly 5 click/drag questions (one per type) with hint + explanation; validated (senses V1–V10, questions Q1–Q9) and written back into `words_master.jsonl`. All content lands `reviewed: 0`.
> - Shared: `openaiClient.ts` (fetch-based, no SDK), `master-store.ts` (master IO + resume sidecars), `question-validators.ts`. See [`content-tool/PHASE3_4_RUNBOOK.md`](../content-tool/PHASE3_4_RUNBOOK.md).
>
> **Why the bulk run is deferred (Ryan, 2026-06-10):** at the observed API latency a full Phase-4 pass is ~50 words/min and ≈$7–30 — multi-hour, and the wrong *unit of work* for bulk seeding. A partial Phase-3 categorize run (~500/2,881 words) was executed to validate the command, then **reverted** (half-categorized master = inconsistent). The commands are correct, tested, and resume-safe; what's missing is a scalable seeding strategy (e.g. OpenAI **Batch API** at ~50% cost + async, many-words-per-call, or seeding in frequency-prioritized waves), not more code. Decide that before running the full set.

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
| Questions live inside the master file | `"questions": []` for un-enriched words; 5 per word for initial seed; populated by enrichment run alongside senses |
| Question types: click/drag only, no typing | `multiple_choice`, `definition_match`, `fill_blank`, `sentence_order`, `true_false` — all answered by tap or drag. Passive-recognition constraint applies. |
| Each question has `hint` + `explanation` | `hint` = nudge shown on request before answering; `explanation` = shown post-answer (correct or wrong), explains why |
| No new words for now | 2,848 foundation words is the scope. Seeding is expensive (explanation + examples per sense + 5 questions + audio + maybe images/video). Don't expand until existing words are fully seeded |
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
  ],

  // Questions — [] until enriched. 5 per word for initial seed.
  // All types answered by tap or drag — NO typing.
  "questions": [
    {
      "question_index": 0,
      "type": "multiple_choice",
      "prompt": "Which sentence uses 'negotiate' correctly?",
      "correct": "They met to negotiate the terms of the contract.",
      "distractors": ["She negotiated the window open.", "He negotiated a loud sound.", "They negotiated the soup slowly."],
      "hint": "Think about two sides trying to agree on something.",
      "explanation": "'Negotiate' means to discuss until both sides reach an agreement — like a salary, a price, or a treaty.",
      "reviewed": false
    },
    {
      "question_index": 1,
      "type": "definition_match",
      "prompt": "negotiate",
      "correct": "To discuss something in order to reach an agreement",
      "distractors": ["To argue and refuse to compromise", "To sign a legal document", "To avoid a difficult topic"],
      "hint": null,
      "explanation": "Negotiation always involves two or more parties working toward a shared outcome.",
      "reviewed": false
    },
    {
      "question_index": 2,
      "type": "fill_blank",
      "prompt": "The workers and managers met to ___ a new salary agreement.",
      "correct": "negotiate",
      "distractors": ["celebrate", "ignore", "cancel"],
      "hint": "They are trying to reach a decision together.",
      "explanation": "When two sides discuss terms to find agreement, that is negotiation.",
      "reviewed": false
    },
    {
      "question_index": 3,
      "type": "sentence_order",
      "prompt": "Arrange the words to make a correct sentence:",
      "correct": "She negotiated a better price for the car.",
      "distractors": [],
      "hint": "Who did the action? What was the outcome?",
      "explanation": "The subject (She) acts on the object (price) through negotiation.",
      "reviewed": false
    },
    {
      "question_index": 4,
      "type": "true_false",
      "prompt": "\"Negotiate\" means to force someone to do something against their will.",
      "correct": "False",
      "distractors": ["True"],
      "hint": "Does negotiation involve force, or discussion?",
      "explanation": "Negotiation is a two-way discussion toward agreement — not coercion. Force is the opposite of negotiation.",
      "reviewed": false
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

### `word_questions` table (new — in `words.db`, content side)

```sql
CREATE TABLE word_questions (
  id              TEXT PRIMARY KEY,
  word_id         TEXT NOT NULL,
  question_index  INTEGER NOT NULL,
  type            TEXT NOT NULL,        -- multiple_choice | definition_match | fill_blank | sentence_order | true_false
  prompt          TEXT NOT NULL,
  correct         TEXT NOT NULL,
  distractors     TEXT NOT NULL,        -- JSON array (empty array for sentence_order)
  hint            TEXT,                 -- nullable — shown on request before answering
  explanation     TEXT,                 -- nullable — shown post-answer
  reviewed        INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL,
  deleted_at      INTEGER,
  UNIQUE (word_id, question_index),
  FOREIGN KEY (word_id) REFERENCES words(id)
);

CREATE INDEX idx_word_questions_word ON word_questions(word_id) WHERE deleted_at IS NULL;
```

### `quiz_attempts` — add `question_id` (user.db migration)

```sql
ALTER TABLE quiz_attempts ADD COLUMN question_id TEXT;
-- NULL = algorithmic question (old behaviour)
-- Populated = authored question from word_questions
```

Add as `migration_003` in `mobile/src/infrastructure/db/migrations/`.

### `word_tiers`, `word_senses`, `sense_examples` — unchanged

The JSONL import populates all of them.

---

## Pipeline Changes

### Commands that change

| Command | Before | After |
|---|---|---|
| `import` | reads CSV, takes `--tier` flag, populates `words` + `word_tiers` | reads JSONL master, no `--tier` flag needed, populates `words` + `word_tiers` + `word_senses` + `sense_examples` + `word_questions` + `words.reviewed` |
| `ingest-senses` | reads `senses-enriched.jsonl`, populates `word_senses` + `sense_examples` | **merged into `import`** — senses + questions ingested in the same pass |
| `enrich-senses` | outputs to separate `senses-enriched.jsonl` | outputs back into `words_master.jsonl` (updates `senses` + `questions` arrays in-place per word) |

### Commands that stay the same

`validate`, `release`, `export`, `enrich` (definition enrichment) — unchanged.

### New command: `export-master`

Exports current working DB state back to `words_master.jsonl` (for round-tripping: DB → JSONL → edit → re-import). Useful for bulk edits via a text editor or spreadsheet tool that can handle JSONL.

---

## Migration: existing working.db → words_master.jsonl

One-time script (run once, then the JSONL is the source of truth):

1. `SELECT w.*, GROUP_CONCAT(wt.tier_id) FROM words w LEFT JOIN word_tiers wt ON w.id = wt.word_id WHERE w.deleted_at IS NULL GROUP BY w.id ORDER BY w.frequency_rank`
2. For each row, fetch senses + examples from `word_senses` + `sense_examples`
3. For each row, fetch questions from `word_questions` (empty array if none yet)
4. Build `categories` array: cefr_level first (if set), then all tier slugs
5. Set `reviewed: false` for all (no word has been manually reviewed yet)
6. Write one JSON line per word to `data/input/words_master.jsonl`

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

### Phase 1 — Schema + migration (no enrichment yet) — ✅ DONE (commit 07e032d)
- [x] Add `reviewed` column to `ddl.ts` `CREATE_WORDS` (+ `idx_words_reviewed`)
- [x] Add `word_questions` table + index to `ddl.ts` `CONTENT_DB_DDL`
- [x] Add `reviewed` to `WordRow` + `WordQuestionRow`/`QuestionType` to `schema/types.ts`
- [x] Idempotent working-DB migrations in `lib/db.ts` (reviewed col + word_questions table)
- [x] `export.ts` carries `reviewed` + `word_questions` through to the output `words.db`
- [x] Write `export-master` command (DB → JSONL, includes senses + questions) + test
- [x] Generate `data/input/words_master.jsonl` from current working.db (2,881 words, 12 with senses, 0 questions)
- [ ] ~~`migration_003` in `mobile/src/infrastructure/db/`~~ — **DEFERRED.** Belongs with the mobile question-rendering feature (a confirmation-gated high-risk path), not the content pipeline. Adding an unused nullable column now vs. with that feature is functionally identical. Re-list it as the first task of the mobile authored-questions feature.

> Note: most foundation words carry no CEFR in `categories` because the legacy `foundation.csv` used a `cefr` header the importer mapped to nothing — pre-existing content debt, fixed during Phase 3 cross-referencing, not by this code.

### Phase 2 — Import pipeline rewrite — ✅ DONE (code) (this commit)
- [x] `import --source *.jsonl` routes to the master importer (`import-master`); `--tier` not required for JSONL (CSV path kept only for export self-bootstrap + pseudo-words)
- [x] Parse `categories` → route CEFR → `cefr_level`, tier slugs → `word_tiers`; unknown slug = hard error; >1 CEFR warns + keeps first
- [x] Ingest `senses` + `questions` in the same pass (full upsert per word; children replaced clean-slate)
- [x] Tests: coerce/parse/import + round-trip `export-master ↔ import-master` (237 content-tool tests green)
- [x] Verified end-to-end: real master JSONL loads into a fresh DB → 2,881 words / 2,894 memberships / 15 senses / 45 examples, 0 errors; `validate --strict` = 0 errors / 2,802 known warnings; `release` rebuilt `words.db` (new schema present) → copied to `mobile/assets/vocab/`
- [ ] **Update `enrich-senses` output to master format + generate questions — DEFERRED to Phase 4.** Coupled to the paid run: it requires extending the Anthropic provider prompt to also produce the 5 questions (with hint/explanation) and the V-rule validators for them. That prompt is a content-quality decision Ryan gates (as he gated the senses prompt), so it lands with the approved enrichment run, not before.

### Phase 3 — Cross-reference specialty tiers + fix CEFR debt — CODE DONE; bulk run HELD
- [x] `categorize` command + `OpenAiCategorizeProvider` (`gpt-4.1-mini` default) — model assigns CEFR + specialty tiers
- [x] Merge into `categories` in place (never drops `foundation`/existing tiers; dedup + sort; CEFR first)
- [x] Resume sidecar `<master>.categorize-done.jsonl`; `--limit` required; cost estimate; `--dry-run`
- [x] Validated on a partial run (~500 words; CEFR coverage 91 → ~491, tiers populating sensibly) — then reverted
- [ ] **HELD:** full run on all words. Cheap (~$0.28) — can run anytime, but bundled with the Phase-4 seeding-strategy decision.
- Command: `npm run cli -- categorize --limit 3000 --model gpt-4.1-mini`

### Phase 4 — Rich senses + 5 questions per word — CODE DONE; bulk run HELD
- [x] `enrich-master` command + `OpenAiSenseQuestionProvider` — felt senses + examples + 5 questions
- [x] 5 questions/word, one of each type (multiple_choice, definition_match, fill_blank, sentence_order, true_false), click/drag only, each with hint + explanation
- [x] Senses (V1–V10) + questions (Q1–Q9) validated pre-write; invalid items dropped fail-closed
- [x] Written back into `words_master.jsonl`; resume via empty-senses selection + `<master>.enrich-skipped.jsonl`
- [ ] **HELD:** the bulk run (too slow/costly per-word at 2,848-word scale). Needs a Batch-API / many-per-call strategy first.
- Command (when ready): `npm run cli -- enrich-master --limit <n> --model gpt-4.1` (resume-safe)
- All generated content is `reviewed: 0` — Ryan flips `reviewed: true` per word after QA.

---

## Files Superseded (do not use, do not re-import)

These files are kept in `data/input/` as historical reference but must not be used as import sources once Phase 1 is complete:

- `foundation.csv`, `foundation-200-original.csv`, `foundation-3k.csv`, `foundation_3000.csv`
- `toefl.csv`, `ielts.csv`, `gre.csv`, `gmat.csv`, `business.csv`, `advanced.csv`
- `common9k.csv`, `common3k.csv`

Move to `data/input/archive/` after Phase 1 to prevent accidental re-use.

---

*Created: 2026-06-10. Owner: content pipeline agent. Unblock: implement Phase 1–2 before any enrichment run.*
