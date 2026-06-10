---
title: Content Pipeline Architecture
category: content-data
status: active
updated: 2026-06-10
priority: P0
tags: [content-pipeline, cli, sqlite, jsonl, enrichment, neural-tts, polly, google-tts, openai, unsplash, app-agnostic, two-db, versioning]
---

# Content Pipeline Architecture

> ⚠️ **PIPELINE REDESIGN IN PROGRESS (2026-06-10)** — The CSV-per-tier input format is being
> replaced with a single `words_master.jsonl` file. See
> [`/plans/CONTENT_PIPELINE_JSONL_PLAN.md`](/plans/CONTENT_PIPELINE_JSONL_PLAN.md) for the
> full spec and implementation phases. Do NOT use the legacy CSV files as import sources;
> do NOT run `import --source *.csv --tier <slug>`. The sections below describe the old
> architecture; they will be updated once the JSONL pipeline (Phases 1–2) is implemented.
>
> **Key decisions:**
> - Single `data/input/words_master.jsonl` replaces all separate tier CSVs
> - `categories` array per word (e.g. `["B2", "foundation", "toefl"]`) replaces both `cefr_level` column and separate tier files
> - `reviewed` boolean added to both JSONL and `words` table
> - Senses nested inside each word object — `ingest-senses` merged into `import`
> - 2,848 foundation words is the scope; no new words until existing words are fully seeded

Authoritative build specification for the LexiTap content tool ("Track A") — the local
developer CLI that turns the founder's frequency-ordered word corpora into the read-only
`words.db` bundled with the mobile app.

This is the comprehensive (lexitap-docs) expansion of the agent-handoff spec at
[../06-content-data/CONTENT_PIPELINE_ARCHITECTURE.md](../06-content-data/CONTENT_PIPELINE_ARCHITECTURE.md).
The output schema is owned by [../04-technical-architecture/DATABASE_SCHEMA.md](../04-technical-architecture/DATABASE_SCHEMA.md);
where this doc and the schema disagree, the schema wins. Strategy context lives in
[../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md](../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md). Seed content
maps in via [./SEED_DATA_SPEC.md](./SEED_DATA_SPEC.md).

This is Backlog #41 (P0, Phase-1 blocker): nothing in the mobile app's content layer can be
built or tested until a valid `words.db` exists, and this tool is the only thing that produces one.

## Table of Contents

- [Scope and Non-Goals](#scope-and-non-goals)
- [Sourcing Model (Resolved 2026-05-23)](#sourcing-model-resolved-2026-05-23)
- [Tool Overview](#tool-overview)
- [File Structure](#file-structure)
- [Data Model: Working DB vs Output DB](#data-model-working-db-vs-output-db)
- [Input Schemas](#input-schemas)
- [Command Reference](#command-reference)
  - [import](#import)
  - [validate](#validate)
  - [enrich](#enrich)
  - [export](#export)
- [Enrichment Strategies and Costs](#enrichment-strategies-and-costs)
- [Build Script](#build-script)
- [App-Agnostic Parameterization](#app-agnostic-parameterization)
- [Integration with the Mobile App (Two-DB Bundling)](#integration-with-the-mobile-app-two-db-bundling)
- [Versioning and Diffing](#versioning-and-diffing)
- [Open Questions](#open-questions)

## Scope and Non-Goals

In scope:

- Ingest founder-supplied frequency corpora (CSV) + multi-word entries (CSV/JSON).
- Validate data quality against the invariants in `DATABASE_SCHEMA.md`.
- Enrich words with definitions, synonyms/antonyms, audio, and curated imagery.
- Export a read-only SQLite `words.db` + asset bundle for the app.
- Write *actual* per-tier word counts into `content_tiers` at build time.
- Support reproducible, diffable rebuilds across content versions.

Not in scope:

- No web scraping, no CEFR word-list licensing, no test-passage analysis. The corpora already
  exist (see next section). The tool only *enriches* what the founder provides.
- No per-word AI image generation at MVP (curated imagery only — cost + Year 2 differentiator per [../01-discovery-strategy/VISION_PROBLEM_STATEMENT.md](../01-discovery-strategy/VISION_PROBLEM_STATEMENT.md)).
- No pronunciation training / scoring. Audio is reference-only.
- The tool never ships in the app and never touches user data (`user_progress`,
  user data tables). It produces content only.

## Sourcing Model (Resolved 2026-05-23)

Content sourcing is **frequency-based and already resolved**. The founder possesses the corpora:

| Category slug | Source corpus                          | Access |
|---------------|----------------------------------------|--------|
| `foundation`  | Top 3,000 most-used English words (A2-B1) | Free |
| `advanced`    | Words 3,001–9,000 by real-world frequency (B2-C1) | Free |
| `toefl`       | 3,000 TOEFL words                      | Paid exam pack (`com.lexitap.exam.toefl`, $9.99 one-time) |

> **Words carry many-to-many category tags.** A single word can belong to several categories
> (e.g. a frequency word that is also on the TOEFL list). Category membership is therefore a
> many-to-many relationship, not one category per word. See
> [../04-technical-architecture/DATA_MODELS.md](../04-technical-architecture/DATA_MODELS.md) —
> the schema migration to a `word_tiers` junction is **pending (not yet implemented in code)**.

> **Free vs. paid.** Foundation, Advanced, Most Common 3000, and Most Common 9000 are all free
> (word + sentence audio included). The only paid content is one-time, non-consumable exam packs
> (`com.lexitap.exam.{toefl,ielts,gre,gmat,business}`, $9.99 each) plus an All-Exams bundle
> (`com.lexitap.bundle.full`, $29.99). No subscriptions, no per-corpus "Premium Pass."

Therefore pipeline work is **enrichment only** — definitions, audio, imagery, example
sentences, synonyms/antonyms. There is no acquisition phase.

> **Authority note.** Any older "Word Sourcing Strategies" framing — scraping achievethecore.org,
> Cambridge IELTS books, Google Ngrams, COCA, etc., or a Common-Core / SAT framing — predates the
> 2026-05-23 sourcing decision and the ESL-only audience split. It is **obsolete** and must not
> drive any build work. This doc is the current authority on sourcing.

Word counts are **not pre-committed** anywhere in marketing. The `export` command writes the
real counts it observes into `content_tiers.word_count`.

## Tool Overview

A TypeScript CLI run with `npx lexitap-tool <command>` (or `npm run build:db` for the full
pipeline). Pipeline stages:

```
CSV/JSON input  ──import──▶  working.db  ──validate──▶  (report)
                                  │
                                  ├──enrich (OpenAI / TTS / Unsplash)──▶ working.db + assets/
                                  │
                                  └──export──▶  data/output/words.db  +  data/output/assets/
```

- `working.db` is a mutable scratch SQLite DB — the staging area where rows accumulate and
  get enriched across multiple runs.
- `words.db` is the immutable, app-bound output, rebuilt from scratch on every `export`.

## File Structure

```
lexitap-content-tool/
├── package.json              # bin: { "lexitap-tool": "dist/cli.js" }
├── tsconfig.json
├── lexitap.config.json       # app_id, tier definitions
├── .env                       # OPENAI_API_KEY, AWS creds (Polly), GOOGLE_TTS creds, UNSPLASH_ACCESS_KEY (gitignored)
├── src/
│   ├── cli.ts                # argument parsing and command dispatch
│   ├── commands/
│   │   ├── import.ts
│   │   ├── validate.ts
│   │   ├── enrich.ts
│   │   └── export.ts
│   ├── providers/
│   │   ├── openai.ts         # synonyms/antonyms, definition cleanup
│   │   ├── polly.ts          # neural audio TTS (Amazon Polly, default)
│   │   ├── googleTts.ts      # neural audio TTS (Google Cloud, alt)
│   │   └── unsplash.ts       # curated image search + download
│   ├── db/
│   │   ├── working.ts        # open/migrate working.db
│   │   ├── output.ts         # build words.db
│   │   └── migrations/
│   │       └── 001_initial_schema.sql   # mirrors DATABASE_SCHEMA.md
│   └── lib/
│       ├── ids.ts            # stable word-id hashing
│       ├── csv.ts            # parsing + schema coercion
│       └── manifest.ts       # build manifest / diff
├── data/
│   ├── input/
│   │   ├── foundation.csv
│   │   ├── advanced.csv
│   │   ├── toefl.csv
│   │   └── idioms.csv         # multi-word entries (post-launch tiers)
│   ├── working/
│   │   └── working.db
│   ├── assets/                # enrichment scratch (downloaded audio/images)
│   │   ├── audio/
│   │   └── images/
│   └── output/
│       ├── words.db
│       ├── build-manifest.json
│       └── assets/
│           ├── audio/
│           └── images/
└── scripts/
    └── build-db.sh
```

## Data Model: Working DB vs Output DB

Both DBs use the schema from `DATABASE_SCHEMA.md` for the content tables (`content_tiers`,
`words`). The output DB contains **only** content tables — never user tables. The mobile app
attaches a separate `user.db` at runtime (see [two-DB bundling](#integration-with-the-mobile-app-two-db-bundling)).

`working.db` carries one **pipeline-only** column that is never exported to `words.db`:

| Column | Type | Values | Purpose |
|---|---|---|---|
| `definition_status` | TEXT | `'pending_generation'` \| `'pending_review'` \| `'approved'` | Tracks human review state. `import` sets `pending_generation` for rows without a definition; `enrich --add-definitions` sets `pending_review` after AI drafting; `review-definitions` sets `approved` after founder sign-off. `export` aborts if any active row is not `approved`. |

Stable word IDs are generated deterministically so re-imports are idempotent and diffs are stable:

```
id = `word_${tier}_${sha1(normalize(word) + '|' + tier).slice(0, 8)}`
// normalize: trim, lowercase, collapse internal whitespace (so "look  up to" == "look up to")
// example: word_foundation_3f9a1c0b
```

Determinism matters: the same `word`+`tier` always yields the same ID, so `user_progress`
references survive a content rebuild. Editing a word's meaning should be done via
`definition`/`usage_notes`, NOT by changing the `word` string (which would re-key the row and
orphan review history).

## Input Schemas

### CSV (single-word tiers: foundation, advanced, toefl)

Header row required. Columns (order-independent, matched by name):

```
word,definition,pos,cefr_level,theme,example_sentence,difficulty,word_type
catalyst,A substance that makes a chemical reaction happen faster,noun,B2,Science & Nature,The enzyme acted as a _ in the reaction.,3,vocabulary
```

| Column            | Required | Notes |
|-------------------|----------|-------|
| `word`            | yes      | Surface form. For multi-word, the full string. |
| `definition`      | yes      | Plain-English, ESL-friendly. See `SEED_DATA_SPEC.md` quality bar. |
| `example_sentence`| yes      | Exactly one `_` (the blank). Enforced by validate. |
| `pos`             | optional | `noun`/`verb`/`adjective`/`adverb`/... |
| `cefr_level`      | optional | `A2`,`B1`,`B2`,`C1`. Descriptive only — not a sourcing license. |
| `theme`           | cond.    | **Required** for `foundation`/`advanced`. See theme taxonomy in `SEED_DATA_SPEC.md`. |
| `difficulty`      | optional | Integer 1–5. Defaults to 3 if absent. |
| `word_type`       | optional | Defaults `vocabulary`. `idiom`/`phrasal_verb`/`expression` for multi-word. |

`tier_id`, `created_at`, `id` are NOT in the CSV — `import` sets them (`tier_id` from `--tier`).

### JSON (alternative / multi-word with richer fields)

```json
[
  {
    "word": "break the ice",
    "definition": "To do or say something to make people feel relaxed in a social situation.",
    "word_type": "idiom",
    "pos": "verb",
    "example_sentence": "She told a joke to _ at the start of the meeting.",
    "difficulty": 3,
    "synonyms": ["loosen up", "get things started"],
    "antonyms": []
  }
]
```

`synonyms`/`antonyms` arrays in JSON are stored directly; in CSV they are left empty and filled
by `enrich`.

## Command Reference

### import

Ingest a source file into `working.db`. Idempotent: re-importing upserts by stable ID.

```bash
npx lexitap-tool import --source <path> --tier <slug> [options]
```

| Flag            | Required | Default     | Description |
|-----------------|----------|-------------|-------------|
| `--source <p>`  | yes      | —           | Path to `.csv` or `.json` (format inferred by extension). |
| `--tier <slug>` | yes      | —           | Target tier (`foundation`,`advanced`,`toefl`,...). |
| `--type <t>`    | no       | `vocabulary`| Default `word_type` for rows lacking the column. |
| `--app <id>`    | no       | config      | `app_id` (see app-agnostic section). |
| `--dry-run`     | no       | false       | Parse + report counts, write nothing. |
| `--on-conflict` | no       | `update`    | `update` \| `skip` \| `error` for existing IDs. |

```bash
npx lexitap-tool import --source data/input/foundation.csv --tier foundation
npx lexitap-tool import --source data/input/idioms.csv --tier idioms --type idiom
npx lexitap-tool import --source data/input/toefl.csv --tier toefl --dry-run
```

Behavior: assigns `id` (stable hash), sets `tier_id`, `created_at = Date.now()`, normalizes
whitespace, coerces `difficulty` to int. Rows missing a *required* field are reported and
skipped (not silently written). Prints `imported N / skipped M / updated K`.

### validate

Check `working.db` against schema invariants. Exits non-zero on any error (CI-friendly).

```bash
npx lexitap-tool validate [--tier <slug>] [--strict] [--format text|json]
```

Validation rules:

1. **Required fields present:** `word`, `definition`, `tier_id`, `example_sentence` non-null.
2. **Exactly one blank:** `example_sentence` contains exactly one `_` character.
3. **Duplicate surface form:** no two active rows share `(normalize(word), tier_id)`.
4. **Valid tier:** `tier_id` exists in the configured tier set.
5. **Theme required:** `foundation`/`advanced` rows must have non-empty `theme` from the taxonomy.
6. **JSON arrays:** `synonyms`/`antonyms`, if present, parse as JSON arrays of strings.
7. **Asset references:** any `image_path`/`audio_path` points to an existing file under `data/assets/`.
8. **word_type enum:** one of `vocabulary`,`expression`,`idiom`,`phrasal_verb`.
9. **Blank is whitespace-delimited** (`--strict`): warns on `wor_d` (underscore inside a token).

Example output:

```
Validation Report (working.db)
------------------------------
foundation   2987 rows   OK
advanced     5994 rows   OK
toefl        2961 rows   2 errors

ERRORS
  word_toefl_8a1f0c2d  example_sentence: expected exactly one '_', found 0
  word_toefl_1b7e44a9  theme: required for tier but absent

11942 rows checked, 2 errors, 5 warnings
```

### enrich

Add generated/curated fields to existing rows in `working.db`. Each enrichment is opt-in via a
flag; enrich never invents the `word` (founder-supplied). Caches by `word_id` so re-runs skip
already-enriched rows unless `--force`.

```bash
npx lexitap-tool enrich --tier <slug> [enrichment flags] [options]
```

| Flag                  | Description |
|-----------------------|-------------|
| `--add-synonyms`      | Fill `synonyms`/`antonyms` via OpenAI; store as JSON arrays. |
| `--add-audio`         | Generate pronunciation audio; set `audio_path`. |
| `--add-images`        | Curate one image per word; set `image_path`. |
| `--provider <name>`   | `openai` (text), `polly`\|`google` (neural audio TTS), `unsplash` (images). |
| `--tier <slug>`       | Limit to one tier (required to bound cost). |
| `--limit <n>`         | Cap rows processed this run (incremental enrichment). |
| `--force`             | Re-enrich rows that already have the field. |
| `--dry-run`           | Show what would be called + cost estimate, no API calls. |

```bash
npx lexitap-tool enrich --tier toefl --add-audio --provider polly
npx lexitap-tool enrich --tier foundation --add-synonyms --provider openai --limit 500
npx lexitap-tool enrich --tier toefl --add-images --provider unsplash --dry-run
```

### review-definitions

Interactive human-review step for AI-generated definitions (see [SEED_DATA_SPEC.md — Human-in-the-Loop Definition Quality Protocol](./SEED_DATA_SPEC.md#human-in-the-loop-definition-quality-protocol)). Presents each `pending_review` row to the founder in the terminal; founder approves or rewrites inline.

```bash
npx lexitap-tool review-definitions --tier <slug> [options]
```

| Flag | Description |
|---|---|
| `--tier <slug>` | Review only words in this tier (required to bound the session). |
| `--limit <n>` | Cap rows reviewed this session (resume next run — already-approved rows are skipped). |
| `--format compact\|full` | `compact` shows word + definition only; `full` adds example sentence and POS. |

For each row the tool prints:

```
[1/47] WORD: catalyst  POS: noun  CEFR: B2
DEF:  A substance that makes a chemical reaction happen faster without being used up.
EX:   The enzyme acted as a _ in the reaction.
(a)pprove  (e)dit  (s)kip  (q)uit
```

- **approve** → sets `definition_status = 'approved'`.
- **edit** → opens inline editor; saves the typed text then sets `approved`.
- **skip** → leaves row in `pending_review` (revisit later).
- **quit** → persists progress and exits cleanly.

```bash
npx lexitap-tool review-definitions --tier toefl
npx lexitap-tool review-definitions --tier foundation --limit 100 --format compact
```

### export

Build the immutable `words.db` from `working.db`. Always rebuilds from scratch.

```bash
npx lexitap-tool export [--output data/output/words.db] [--app <id>] [--bump <kind>]
```

Steps:

1. Create a fresh `words.db`, run `001_initial_schema.sql` (content tables only).
2. Populate `content_tiers` from config — and write the **observed** `word_count` per tier
   (count of active rows). This is where real counts land; nothing is pre-committed.
3. Copy active (`deleted_at IS NULL`) `words` rows from `working.db`.
4. Copy referenced assets into `data/output/assets/{audio,images}/`, dropping unreferenced files.
5. Set `PRAGMA user_version` to the content version integer (see versioning).
6. Write `build-manifest.json` (per-tier counts, content version, enrichment coverage, asset
   totals, source-file hashes).
7. Run `validate` semantics one final time against the *output* DB; abort on error.

```bash
npm run build:db          # full pipeline (see build script)
npx lexitap-tool export --bump minor
```

## Enrichment Strategies and Costs

Costs are one-time per content build (cached thereafter). Audio is now generated with cheap
neural TTS (Amazon Polly / Google Cloud TTS — not ElevenLabs) and is **free and universal**:
word + sentence audio ships for every category, free and paid alike.

| Enrichment        | Provider (default → alt)        | Stored as            | Cost (this build) |
|-------------------|---------------------------------|----------------------|-------------------|
| Synonyms/antonyms | OpenAI                          | `synonyms`,`antonyms` JSON arrays | a few dollars across all categories |
| Audio (all categories) | Amazon Polly → Google Cloud TTS (neural) | `audio_path` → `assets/audio/{word_id}.mp3` | low (neural TTS is cheap; batch one-time) |
| Imagery           | Unsplash free tier (curated)    | `image_path` → `assets/images/{word_id}.jpg` | $0 (free tier) |

Notes:

- **Synonyms/antonyms (OpenAI):** prompt `List up to 3 common synonyms and up to 3 antonyms for
  "{word}" used as a {pos}, suitable for an ESL learner. Return JSON {"synonyms":[],"antonyms":[]}.`
  Validate the JSON parses before storing.
- **Audio = reference only, free, and universal.** Generated with neural TTS (Amazon Polly,
  Google Cloud TTS as the alternate) — **not** ElevenLabs, which is no longer used. Word and
  sentence audio ship for every category (Foundation, Advanced, Most Common 3000/9000, and the
  paid exam packs); audio is never gated behind a purchase. Not pronunciation training.
- **Imagery is curated, not per-word AI-generated** at MVP. Unsplash free tier (or similar);
  one representative image per word, manually spot-checked. Per-word AI imagery is a Year 2
  differentiator (Backlog #34), deliberately deferred for cost.

## Build Script

`scripts/build-db.sh` — one command, fully reproducible, fails fast.

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Building LexiTap content database..."

# 1. Import all launch tiers (idempotent; safe to re-run)
npx lexitap-tool import --source data/input/foundation.csv --tier foundation
npx lexitap-tool import --source data/input/advanced.csv   --tier advanced
npx lexitap-tool import --source data/input/toefl.csv      --tier toefl

# 2. Validate before spending money on enrichment
npx lexitap-tool validate --strict

# 3. Enrich (cached; re-runs skip completed rows)
npx lexitap-tool enrich --tier foundation --add-synonyms --provider openai
npx lexitap-tool enrich --tier advanced   --add-synonyms --provider openai
npx lexitap-tool enrich --tier toefl      --add-synonyms --provider openai
# Audio is free + universal: generate word + sentence audio for every category via neural TTS
npx lexitap-tool enrich --tier foundation --add-audio     --provider polly
npx lexitap-tool enrich --tier advanced   --add-audio     --provider polly
npx lexitap-tool enrich --tier toefl      --add-audio     --provider polly
npx lexitap-tool enrich --tier foundation --add-images    --provider unsplash

# 4. Human review gate — approve all AI-generated definitions before export
#    (skipped if all definitions were founder-supplied and already set to 'approved')
npx lexitap-tool review-definitions --tier foundation
npx lexitap-tool review-definitions --tier advanced
npx lexitap-tool review-definitions --tier toefl

# 5. Export immutable words.db (+ final validation, manifest, user_version bump)
#    Will abort if any active row still has definition_status != 'approved'
npx lexitap-tool export --output data/output/words.db --bump patch

echo "Build complete: data/output/words.db"
```

Wire into `package.json`:

```json
{ "scripts": { "build:db": "tsx src/cli.ts export" } }
```

## App-Agnostic Parameterization

The pipeline is parameterized by **`app_id` + tier `slug`** so future sister apps (USA Schools,
Europe CEFR) reuse the identical editorial/audio/image workflow. This is a *design constraint*,
not Phase-1 scope — LexiTap is the only `app_id` we build now.

`lexitap.config.json`:

```json
{
  "app_id": "lexitap",
  "tiers": [
    { "slug": "foundation", "name": "LexiTap Foundation (CEFR A2-B1)", "is_free": true,  "sku": null,                     "display_order": 1, "requires_theme": true,  "audio": true },
    { "slug": "advanced",   "name": "LexiTap Advanced (CEFR B2-C1)",   "is_free": true,  "sku": null,                     "display_order": 2, "requires_theme": true,  "audio": true },
    { "slug": "toefl",      "name": "TOEFL Vocabulary",                "is_free": false, "sku": "com.lexitap.exam.toefl", "display_order": 3, "requires_theme": false, "audio": true }
  ]
}
```

Rules:

- Tier rows in `content_tiers` are generated from this config at `export`; word counts are NOT
  taken from config (they are observed).
- `--app <id>` selects the active config block; output paths become `data/output/<app_id>/words.db`.
- Nothing in `src/` hard-codes "lexitap" — app/tier identity flows from config + flags only.
- A sister app is added by writing a new config block + new `data/input/<app_id>/` corpora. No
  code changes; the same four commands run unchanged.

## Integration with the Mobile App (Two-DB Bundling)

The app uses two SQLite databases joined via `ATTACH DATABASE`:

| DB           | Source                | Mode        | Contents |
|--------------|-----------------------|-------------|----------|
| `content.db` | this tool (`words.db`)| read-only   | `content_tiers`, `words` |
| `user.db`    | created on device     | read-write  | `user_progress`, `quiz_*`, `event_log`, `user_stats` |

The split keeps user data safe across content updates (full `words.db` swaps never touch
`user.db`). See the two-DB strategy in
[../04-technical-architecture/DATABASE_SCHEMA.md](../04-technical-architecture/DATABASE_SCHEMA.md).

Bundling / install:

1. Ship `words.db` in the app bundle at `mobile-app/assets/content/words.db`; ship enrichment
   assets at `mobile-app/assets/vocab/{audio,images}/`.
2. On first launch, copy `words.db` from the read-only bundle into the app's writable document
   directory (expo-sqlite cannot open a DB embedded in the read-only bundle directly), then open
   it read-only.
3. Open/create `user.db` separately; `ATTACH` `content.db` for join queries (e.g.,
   `getWordsDueForReview` joins `words` × `user_progress`).

Content update (an app store update ships a new `words.db`):

1. Compare bundled `content.db` `PRAGMA user_version` with the installed copy.
2. If newer, replace the installed `content.db` (it is read-only — safe to overwrite wholesale).
3. **Never touch `user.db`.** Because word IDs are stable hashes, existing `user_progress` rows
   still resolve; words removed from content become soft-deleted referents (handled by the
   schema's soft-delete + history-query convention).

## Versioning and Diffing

- **Content version** is an integer written to `PRAGMA user_version` (and recorded
  semver-style in `build-manifest.json` for humans). `export --bump patch|minor|major` advances it.
- **`build-manifest.json`** per build:

```json
{
  "app_id": "lexitap",
  "content_version": "1.2.0",
  "user_version": 10200,
  "built_at": "2026-05-24T00:00:00Z",
  "tiers": {
    "foundation": { "words": 2987, "with_synonyms": 2987, "with_images": 2987, "with_audio": 2987 },
    "advanced":   { "words": 5994, "with_synonyms": 5994, "with_images": 0,    "with_audio": 5994 },
    "toefl":      { "words": 2961, "with_synonyms": 2961, "with_images": 0,    "with_audio": 2961 }
  },
  "assets": { "audio": 11942, "images": 2987 },
  "source_hashes": { "foundation.csv": "sha1:...", "advanced.csv": "sha1:...", "toefl.csv": "sha1:..." }
}
```

> Counts above are illustrative, not committed — they are whatever `export` observes.

- **Diffing builds:** `npx lexitap-tool diff --against data/output/build-manifest.json` (helper)
  reports added/removed/changed `word_id`s between the current `working.db` and a prior manifest.
  Because IDs are stable, a "changed" row means definition/example/enrichment changed, not a
  re-key. This is the basis for release notes and for confirming no accidental mass re-keying
  (which would orphan user progress).

## Open Questions

- `unresolved` — **Definition authoring source.** Not confirmed whether definitions ship in source CSVs or are partly generated/cleaned by OpenAI during enrich. If generated, add `--add-definitions` enrich flag with mandatory human review. (Synonyms/antonyms confirmed; definitions TBD.) Resolve before first content export.
- `requires-external-validation` — **Image licensing at scale.** Unsplash free tier is MVP plan. Attribution/redistribution terms for bundling images offline need a legal check before TOEFL paid launch.
- `requires-product-decision` — **Audio voice selection.** Neural-TTS (Amazon Polly / Google Cloud TTS) voice/accent not yet chosen. Audio is free + universal across all categories; for the TOEFL pack (US-admissions-oriented) a US voice is recommended — confirm.
- `requires-product-decision` — **Free-tier imagery coverage.** Full image coverage vs. subset for Foundation/Advanced. Curation-time cost, not money. Decide at content-build time.
