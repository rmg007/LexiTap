# Rich Word-Detail Plan — felt explanations, multi-sense, multi-example

**Status:** Phase 1 DONE (2026-06-09). Phase 2 gated on Ryan's paid enrichment run.
**Goal:** word detail stops being a one-line dictionary gloss. Each word gets, **per distinct meaning**, a *felt explanation* (so the learner internalizes the word, not just decodes it) + multiple natural examples + an optional image. Two meanings → both fully treated.

**Decisions (Ryan, 2026-06-09):**
- **Media = image only.** No video, no `video_*` column yet (offline-first; bundled `words.db` is 1.18 MB — video would blow the binary). Add a streamed video column only when streaming infra exists.
- **Senses only when genuinely distinct** AND learner-relevant at the word's CEFR level. Do **not** force a 2nd meaning — most A2/B1 words stay single-sense. No filler.
- **Rollout = schema + pipeline now, backfill top-N by frequency first**, long tail over time.

---

## Core design principle — ADDITIVE, zero quiz/SRS ripple

`words.definition` and `words.example_sentence` (the `_`-cloze) **stay exactly as they are** and remain the canonical source the quiz + `domain/srs` engine read. They are **not removed, not touched.** The rich content is a *new layer* the **detail screen** reads. This is the whole de-risk:

- **No `domain/srs` change** (high-risk path untouched).
- **No quiz/assessment change**, no cloze rework. The teaching examples are separate full sentences (no `_`); the quiz keeps using `words.example_sentence`.
- `words.db` is read-only + bundled → new tables are **new reads only** on mobile. **No `user.db` migration.**
- Existing 2,881 words migrate trivially: each becomes `sense_index 0` whose `short_gloss` = old `definition`. (Old `example_sentence` keeps the cloze blank and is NOT copied into teaching examples — teaching examples are freshly written, blank-free.)

A later optional refactor can source cloze from senses; explicitly **out of scope** here.

---

## Schema (additive — `content-tool/src/schema/ddl.ts` + DATABASE_SCHEMA.md)

```sql
CREATE TABLE word_senses (
  id          TEXT PRIMARY KEY,          -- sense_${sha1(word_id + sense_index)}
  word_id     TEXT NOT NULL,
  sense_index INTEGER NOT NULL,          -- 0-based; 0 = primary/most-common meaning
  pos         TEXT,                      -- per-sense PoS (a word's senses can differ: "bank" noun vs verb)
  short_gloss TEXT NOT NULL,             -- dictionary one-liner; used in lists + distractor pools
  explanation TEXT NOT NULL,             -- the FELT teaching text (2–4 sentences, plain, concrete)
  image_path  TEXT,                      -- optional, per sense
  created_at  INTEGER NOT NULL,
  deleted_at  INTEGER,
  UNIQUE (word_id, sense_index),
  FOREIGN KEY (word_id) REFERENCES words(id)
);

CREATE TABLE sense_examples (
  id            TEXT PRIMARY KEY,        -- ex_${sha1(sense_id + example_index)}
  sense_id      TEXT NOT NULL,
  example_index INTEGER NOT NULL,        -- 0-based ordering
  text          TEXT NOT NULL,           -- natural FULL sentence, NO "_" blank (teaching, not quiz)
  created_at    INTEGER NOT NULL,
  UNIQUE (sense_id, example_index),
  FOREIGN KEY (sense_id) REFERENCES word_senses(id)
);

CREATE INDEX idx_word_senses_word    ON word_senses(word_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sense_examples_sense ON sense_examples(sense_id);
```

- `is_cloze` deliberately **omitted** — examples here are always teaching (full) sentences. The cloze lives only in `words.example_sentence`. One concept, one home.
- Bump content `user_version` minor (e.g. `1.2.0` → `10200`). Rebuild + re-bundle `words.db`.

---

## Phases

### Phase 1 — Schema + types foundation (no paid run, no SRS, content-tool only) ✅ DONE (2026-06-09)

**DDL** (done commit `79baec2`): `CREATE_WORD_SENSES` + `CREATE_SENSE_EXAMPLES` + indexes in [ddl.ts](../content-tool/src/schema/ddl.ts); wired into `CONTENT_DB_DDL`. Working-DB migration added to `applyWorkingDbMigrations` in [db.ts](../content-tool/src/lib/db.ts) so existing working DBs get the tables without a full rebuild.

**Types + IDs** (done 2026-06-09): `WordSenseRow` + `SenseExampleRow` in [types.ts](../content-tool/src/schema/types.ts). `makeSenseId(wordId, senseIndex)` + `makeExampleId(senseId, exampleIndex)` in [ids.ts](../content-tool/src/lib/ids.ts) — deterministic SHA-1 prefixed IDs, same recipe as `makeWordId`.

**Ingest format** (JSONL — one object per line, maps 1:1 with model structured output):
```jsonl
{"word_id":"word_<hex>","word":"plant","senses":[
  {"sense_index":0,"pos":"noun","short_gloss":"...","explanation":"...","image_path":null,
   "examples":[{"example_index":0,"text":"Full sentence."},...]},
  {"sense_index":1,"pos":"verb","short_gloss":"...","explanation":"...","examples":[...]}
]}
```
- `word_id` required; `word` optional (readability/cross-check only).
- `sense_index` 0-based, contiguous. Most words = single sense (index 0 only).
- `short_gloss` = one-liner for lists + distractor pools.
- `explanation` = felt teaching text (2–4 sentences, NOT a gloss copy).
- `examples` = full teaching sentences, NO `_` blank (cloze lives only in `words.example_sentence`).
- Re-ingesting a word does a clean-slate replace (old senses+examples deleted, new ones inserted).

**Ingest command**: `npm run cli ingest-senses -- --source <file.jsonl> [--dry-run]` in [ingest-senses.ts](../content-tool/src/commands/ingest-senses.ts). Registered in [cli.ts](../content-tool/src/cli.ts).

**Validator sense rules** wired into `validate` / `validate --strict` in [validate.ts](../content-tool/src/commands/validate.ts):
- S1 word_id must exist (error), S2 sense_index contiguous from 0 (error), S3 short_gloss non-empty (error), S4 explanation non-empty (error), S5 explanation ≠ short_gloss (error), S6 senses start at 0 (error), S7 no identical short_gloss across senses of same word (strict error), S8 explanation looks like a dict gloss (strict warning), S9 explanation < 50 chars (strict warning), E1 example text non-empty (error), E2 example text has `_` blank (error).

**Export**: `buildOutputDb` in [export.ts](../content-tool/src/commands/export.ts) copies active `word_senses` + `sense_examples` rows to the output DB.

**Round-trip proof** (2026-06-09): ingested [sample-senses.jsonl](../content-tool/data/input/sample-senses.jsonl) (12 approved words: plant/design/cook multi-sense + 9 single-sense) → `validate --strict` → **0 errors, 2802 warnings (known baseline)**. 15 senses / 45 examples queryable. `npm run check` GREEN (**129 tests**, +30).

Note: Phase 1 plan step 4 ("synthesize sense_index 0 for every word") is intentionally NOT done — auto-generating placeholder explanations would fill the DB with low-quality stubs that the validator would then flag. The correct flow is: run ingest-senses for the top-N real words (Phase 2), leave the rest with no senses (the mobile detail screen falls back to the flat `definition` field when senses is empty).

### Phase 2 — Enrichment pipeline (the real cost)
1. New enrich mode: given a word + its primary sense, generate (a) detect genuinely-distinct additional senses (conservative — default 1), (b) per sense: felt `explanation`, (c) 2–3 teaching examples per sense.
2. **Prompt is the hard part** — "make the learner feel it" is where generic AI is weakest. Draft prompt + hand-review a 20-word sample with Ryan BEFORE any bulk run. Iterate prompt on the sample until quality bar met.
3. Run on **top-N by `frequency_rank`** first (N = Ryan's call, e.g. 300). Cost-gated, reviewable.
4. `validate --strict`, rebuild `words.db`, re-bundle to `mobile/assets/vocab/`.

### Phase 3 — Mobile read layer ✅ DONE (2026-06-09)
Additive reads only; guarded `infrastructure/db/` (confirmation granted). **No `domain/srs` diff, no `user.db` migration.** `mobile npm run check` GREEN (46 suites / **459 tests**, +4 sense-mapper).
1. ✅ `WordSenseRow` + `SenseWithExampleRow` (the sense⋈example LEFT-JOIN row) in [rows.ts](../mobile/src/infrastructure/db/rows.ts).
2. ✅ One joined query `selectSensesForWord(wordId)` in [wordQueries.ts](../mobile/src/infrastructure/db/queries/wordQueries.ts) — `word_senses LEFT JOIN sense_examples`, `deleted_at IS NULL`, `ORDER BY sense_index, example_index`. Read-only, parameterized.
3. ✅ Domain `WordSense` + `SenseExample` (examples nested in the sense) + `Word.senses?: WordSense[]` ([Word.ts](../mobile/src/domain/vocabulary/Word.ts)). Absence/[] = flat-definition fallback.
4. ✅ `mapSenseRows()` groups the flat join into `WordSense[]` ([mappers.ts](../mobile/src/infrastructure/db/mappers.ts)); relies on the query ORDER BY.
5. ✅ Port `WordRepository.getSensesForWord(id)` + impl in [SQLiteWordRepository.ts](../mobile/src/infrastructure/db/repositories/SQLiteWordRepository.ts) — **fail-soft** (catch → `[]`, exactly like `SQLitePseudoWordRepository`: a content DB predating the rich-detail schema has no tables → throws → flat fallback, never breaks the screen).
6. ✅ Phase-4 seam: `ReadQueries.getWordDetail(id) → { word, senses } | null` ([ServicesContext.tsx](../mobile/src/presentation/services/ServicesContext.tsx)), implemented in [container.ts](../mobile/src/composition/container.ts), defaulted in `mockServices`. One fail-soft call for the detail screen instead of juggling two repo reads.

### Phase 4 — Detail UI ✅ DONE (2026-06-09)
RN port of [LearnCardScreen.tsx](../mobile/src/presentation/screens/LearnCardScreen.tsx). Presentation-only, **no `domain/srs`/`infrastructure/db` diff** (1 file). `mobile npm run check` GREEN (46 suites / **459 tests**).
1. ✅ Senses fetched **lazily per displayed card** via `services.queries.getWordDetail(word.id)` (the Phase-3 fail-soft seam) — cached in a `Record<wordId, WordSense[]>` so re-renders / advance don't refetch; the batch/quiz word reads stay flat (senses only for the card on screen). Rendered numbered (`MEANING n · POS` smallCaps) when >1 sense, plain PoS when single, mirroring Figma page 07 (`359:2`): per meaning = `shortGloss` (bodyLg) + felt `explanation` (body/primary) + `EXAMPLES` list (italic) + divider between meanings. **NO TextInput / no assessment widget** (invariant held).
2. ✅ Graceful fallback: `senses` undefined (still loading) or `[]` (un-backfilled / pre-rich content DB) → existing flat `pos`+`definition`+`exampleSentence` layout. Accessibility label switches to the felt senses when present, flat fields otherwise.
3. Per-sense **image is data-only** (no dynamic-require vocab-image map yet — the flat layout also omits `word.imagePath`); Figma shows a placeholder. Deferred to when the asset map lands.
- **No render test:** repo has no `react-native-testing-library` (screen tests are logic-only) — adding RTL is separate infra. Verified via typecheck + lint + the Phase-3 mapper unit tests.
3. **✅ Figma DONE (2026-06-09).** Page `07 · Words & Review` → `Word Detail — Rebuilt` (`359:2`) rebuilt to the multi-sense layout using `plant` (2-sense showcase): word + phonetic + Listen pill → per meaning (`MEANING n · POS` label, `short_gloss`, felt `explanation`, optional-image placeholder, `EXAMPLES` list) → divider → next meaning. Single-sense original archived to the page's Archive SECTION as `526:183` (Never-Lose-Work). Added Lucide `image` glyph (set 40→41). **Binding gate PASS** (rawFills 0 · text 19/19 bound · emoji 0), screenshot-verified. RN port (1–2 above) must mirror this layout.

---

## Exit criteria
- Phase 1: builder emits the two tables; every word has sense 0; content-tool check green.
- Phase 2: 20-word sample signed off by Ryan; top-N enriched; `validate --strict` clean.
- Phase 3: ✅ mobile reads senses; `npm run check` green (459 tests); **no `domain/srs` diff** (verified — 0 srs files changed).
- Phase 4: ✅ detail screen renders multi-sense + fallback (`npm run check` GREEN, presentation-only); Figma gate PASS (done prior session).
- Docs synced: DATABASE_SCHEMA.md, AGENTS.md (if query patterns change), MEMORY.md.

## Explicitly out of scope (do not start without new go)
- Video (any form). Cloze-from-senses refactor. Full 2,881 re-enrich (backfill only). Audio per-sense.
