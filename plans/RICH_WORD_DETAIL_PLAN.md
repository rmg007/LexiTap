# Rich Word-Detail Plan — felt explanations, multi-sense, multi-example

**Status:** accepted (2026-06-09) — pending execution.
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

### Phase 1 — Schema + types foundation (no paid run, no SRS, content-tool only)
1. Add `CREATE_WORD_SENSES`, `CREATE_SENSE_EXAMPLES` + indexes to [ddl.ts](../content-tool/src/schema/ddl.ts); wire into `CONTENT_DB_DDL`.
2. Update [DATABASE_SCHEMA.md](../lexitap-docs/04-technical-architecture/DATABASE_SCHEMA.md) (schema doc wins per ddl.ts header).
3. content-tool row types + insert helpers + sense/example id hashing.
4. **Migration step in the builder:** for every existing word with no senses, synthesize `sense_index 0` (`short_gloss` = `definition`, `explanation` = TBD-placeholder, 0 examples) so the DB is structurally valid before enrichment. Validator: every active word has ≥1 sense; every sense has non-empty `short_gloss` + `explanation`; warn (don't block) on 0 examples / placeholder explanation.
5. `content-tool npm run check` green.

### Phase 2 — Enrichment pipeline (the real cost)
1. New enrich mode: given a word + its primary sense, generate (a) detect genuinely-distinct additional senses (conservative — default 1), (b) per sense: felt `explanation`, (c) 2–3 teaching examples per sense.
2. **Prompt is the hard part** — "make the learner feel it" is where generic AI is weakest. Draft prompt + hand-review a 20-word sample with Ryan BEFORE any bulk run. Iterate prompt on the sample until quality bar met.
3. Run on **top-N by `frequency_rank`** first (N = Ryan's call, e.g. 300). Cost-gated, reviewable.
4. `validate --strict`, rebuild `words.db`, re-bundle to `mobile/assets/vocab/`.

### Phase 3 — Mobile read layer (guarded `infrastructure/db/` — additive reads, needs confirmation)
1. `WordSenseRow` / `SenseExampleRow` row types ([rows.ts](../mobile/src/infrastructure/db/rows.ts)).
2. Query: `selectSensesForWord(wordId)` + `selectExamplesForSenses(...)` (or one joined query) in [wordQueries.ts](../mobile/src/infrastructure/db/queries/wordQueries.ts). Read-only, parameterized.
3. Domain: `WordSense` + `SenseExample` types under `domain/vocabulary`; `Word.senses?: WordSense[]` (optional — absence = fall back to flat `definition`/`exampleSentence`, so old data + the quiz still work).
4. Mappers.

### Phase 4 — Detail UI
1. [LearnCardScreen.tsx](../mobile/src/presentation/screens/LearnCardScreen.tsx): render senses (numbered when >1), each = `explanation` + example list + optional image. Keep hard invariant: **NO TextInput / no assessment widget on this screen.** *(NOT yet done — RN port.)*
2. Graceful fallback: word with no senses → current single-def layout (top-N backfill means most words show rich, tail shows flat — must not look broken). *(NOT yet done — RN port.)*
3. **✅ Figma DONE (2026-06-09).** Page `07 · Words & Review` → `Word Detail — Rebuilt` (`359:2`) rebuilt to the multi-sense layout using `plant` (2-sense showcase): word + phonetic + Listen pill → per meaning (`MEANING n · POS` label, `short_gloss`, felt `explanation`, optional-image placeholder, `EXAMPLES` list) → divider → next meaning. Single-sense original archived to the page's Archive SECTION as `526:183` (Never-Lose-Work). Added Lucide `image` glyph (set 40→41). **Binding gate PASS** (rawFills 0 · text 19/19 bound · emoji 0), screenshot-verified. RN port (1–2 above) must mirror this layout.

---

## Exit criteria
- Phase 1: builder emits the two tables; every word has sense 0; content-tool check green.
- Phase 2: 20-word sample signed off by Ryan; top-N enriched; `validate --strict` clean.
- Phase 3: mobile reads senses; `npm run check` green; **no `domain/srs` diff**.
- Phase 4: detail screen renders multi-sense + fallback; Figma gate PASS.
- Docs synced: DATABASE_SCHEMA.md, AGENTS.md (if query patterns change), MEMORY.md.

## Explicitly out of scope (do not start without new go)
- Video (any form). Cloze-from-senses refactor. Full 2,881 re-enrich (backfill only). Audio per-sense.
