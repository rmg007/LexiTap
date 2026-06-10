## ✅ Session: Rich Word-Detail Phase 1 remainder — ingest write path (2026-06-09)

**[RICH_WORD_DETAIL_PLAN.md Phase 1 → DONE](../plans/RICH_WORD_DETAIL_PLAN.md).** DDL was already done (`79baec2`); this session added everything needed to GET enrichment output INTO those tables.

### What shipped
- **`WordSenseRow` + `SenseExampleRow`** types in `content-tool/src/schema/types.ts`
- **`makeSenseId(wordId, senseIndex)`** + **`makeExampleId(senseId, exampleIndex)`** in `ids.ts` — deterministic SHA-1 prefixed, same pattern as `makeWordId`
- **DB migration** in `applyWorkingDbMigrations` (db.ts) — creates `word_senses` + `sense_examples` + indexes in existing working DBs without a full rebuild
- **`ingest-senses` command** (`src/commands/ingest-senses.ts`) — reads JSONL, clean-slate per word (old senses/examples deleted, new inserted), registered in `cli.ts`
- **Sense validator** (`validateSenseRows` in validate.ts) — 11 rules (S1–S9 + E1–E2), wired into `runValidate` so `validate` / `validate --strict` cover senses automatically
- **Export copy** (`buildOutputDb` in export.ts) — copies active senses + examples to output DB
- **12-word sample** (`data/input/sample-senses.jsonl`) — plant/design/cook (multi-sense) + 9 single-sense words; Ryan's approved prose bar

### Round-trip verified
`ingest-senses --source data/input/sample-senses.jsonl` → 15 senses / 45 examples written → `validate --strict` → **0 errors, 2802 warnings (known baseline)** → all rows queryable. `npm run check` GREEN (**129 tests**, +30 from 99).

### Ingest format (JSONL, one word per line)
```json
{"word_id":"word_<hex>","word":"plant","senses":[
  {"sense_index":0,"pos":"noun","short_gloss":"...","explanation":"...","image_path":null,
   "examples":[{"example_index":0,"text":"Full sentence."}]}
]}
```
Maps 1:1 with a model's structured output — no post-processing needed. Re-ingesting a word is safe (clean slate).

### Key design calls
- **No auto-stub sense_index 0 for all 2881 words** — the plan originally said "synthesize a placeholder explanation for every word." Rejected: stubs would fill the DB with low-quality text the validator flags. Mobile screen's flat-definition fallback (senses=[]) is the right default until real enrichment lands. Phase 2 enriches top-N only.
- **Sense validator wired into `runValidate`** — not a separate command. Same `validate` / `validate --strict` invocation covers both word and sense rules.
- **Export is additive** — `buildOutputDb` guards with table-existence checks so old working DBs (pre-migration) export safely with 0 senses.

### Next (Ryan's task)
Phase 2 paid enrichment: run top-N words (by `frequency_rank`) through a top-tier model with the "feel it" prompt, output JSONL in the format above, then `ingest-senses --source <output.jsonl>` → `validate --strict` → `export` → copy to mobile/assets/. Budget/N is Ryan's call. Sample-senses.jsonl is the prose-quality reference.
