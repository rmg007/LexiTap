# Content Pipeline Architecture

---
title: Content Pipeline Architecture
category: technical
status: active
phase: 1
priority: P1
updated: 2026-05-22
load_order: 6
tags: [content-pipeline, cli, sqlite, csv, import, validate, enrich, export, audio, images, words, elevenlabs, openai]
---

> Load order: 6 of 14. Load when working on Track A (content CLI tool) or word enrichment tasks. See DATABASE_SCHEMA.md for the output schema.

# LexiTap Content Pipeline

**Purpose:** Local CLI tool to generate, validate, and export vocabulary data.

---

## Overview

The tool:

1. Ingests vocab from CSV/JSON
2. Validates data quality
3. Enriches words (synonyms, audio, images)
4. Exports to SQLite DB (bundled with app)
5. Supports versioning/diffing

**Key constraint:** Runs locally (not in mobile app). Developer tool for content authoring.

---

## File Structure

```
lexicon-content-tool/
├── package.json
├── src/
│   ├── cli.ts
│   ├── commands/
│   │   ├── import.ts
│   │   ├── validate.ts
│   │   ├── enrich.ts
│   │   └── export.ts
│   ├── pipelines/
│   └── sources/
├── data/
│   ├── input/
│   │   ├── foundation.csv
│   │   └── toefl.json
│   ├── assets/
│   │   ├── images/
│   │   └── audio/
│   └── output/
│       └── words.db
└── scripts/
    └── build-db.sh
```

---

## Commands

### 1. `import` - Ingest vocabulary

```bash
npx lexitap-tool import --source data/input/foundation.csv --tier foundation
npx lexitap-tool import --source data/input/toefl.json --tier toefl
```

**CSV format:**

```
word,definition,pos,cefr_level,theme,example_sentence,difficulty
catalyst,Substance that speeds reaction,noun,B2,Science & Nature,The enzyme was a ___ in the process.,3
```

**Mapping:**

- Generate stable ID: `word_{tier}_{hash(word)}`
- Validate required fields: word, definition, tier_id, example_sentence
- Optional: pos, theme, difficulty, image_path, audio_path

---

### 2. `validate` - Check data quality

```bash
npx lexitap-tool validate
```

**Validation rules:**

1. **Duplicates:** Same word in same tier
2. **Missing fields:** Required fields NULL
3. **Invalid tier_id:** References non-existent tier
4. **Malformed sentences:** Example missing underscore `_`
5. **Orphaned assets:** Image/audio paths don't exist
6. **Tier constraints:** Foundation/Advanced must have `theme`
7. **JSON format:** Synonyms/antonyms valid JSON

**Example output:**

```
Validation Report
-----------------
✅ 800 words in foundation: OK
✅ 600 words in toefl: OK
❌ 3 errors found:
  - word_toefl_123: example_sentence missing underscore
  - word_foundation_456: image_path "catalyst.png" not found

Total: 1400 words validated
```

---

### 3. `enrich` - Add synonyms, audio, images

```bash
npx lexitap-tool enrich --tier toefl --add-audio --provider elevenlabs
npx lexitap-tool enrich --tier foundation --add-synonyms --provider openai
```

**Enrichment strategies:**

**Synonyms/Antonyms:**

- OpenAI API: "List 3 synonyms for '{word}' (part of speech: {pos})"
- Store as JSON array in `synonyms` column

**Audio:**

- Option A: Google Cloud TTS (~$10 for 600 words)
- Option B: ElevenLabs (~$50, higher quality)
- Store path: `assets/audio/{word_id}.mp3`

**Images:**

- Option A: Unsplash API (free tier)
- Option B: AI generation (DALL-E/Stable Diffusion)
- Store path: `assets/images/{word_id}.png`

**Cost estimate (10K words):** ~$50-100 one-time

---

### 4. `export` - Generate SQLite DB

```bash
npx lexitap-tool export --output data/output/words.db
```

**What it does:**

1. Create new SQLite DB
2. Run migrations (001_initial_schema.sql)
3. Populate `content_tiers` (static data)
4. Populate `words` from working DB
5. Populate `unlockables` (themes/badges)
6. Copy assets to output/assets/

**Output:**

```
data/output/
├── words.db           # SQLite database
└── assets/
    ├── images/
    └── audio/
```

**Deployment:**

- Copy `words.db` to mobile app: `mobile-app/assets/words.db`
- Copy `assets/` to: `mobile-app/assets/vocab/`

---

## Build Script

One-command build from scratch:

```bash
#!/bin/bash
set -e

echo "🏭 Building LexiTap content database..."

# Import all tiers
echo "📥 Importing word lists..."
npx lexitap-tool import --source data/input/foundation.csv --tier foundation
npx lexitap-tool import --source data/input/advanced.csv --tier advanced
npx lexitap-tool import --source data/input/toefl.json --tier toefl

# Validate
echo "✅ Validating data..."
npx lexitap-tool validate

# Enrich (optional)
# echo "✨ Enriching TOEFL with audio..."
# npx lexitap-tool enrich --tier toefl --add-audio

# Export
echo "📦 Exporting to SQLite..."
npx lexitap-tool export --output data/output/words.db

echo "✅ Build complete! DB ready at data/output/words.db"
```

---

## Word Sourcing Strategies

### Foundation/Advanced (Academic Vocab)

- **Source:** Common Core State Standards word lists (public domain)
- **Tool:** Scrape [https://achievethecore.org](https://achievethecore.org)
- **Manual:** Select ~800 words, write example sentences

### TOEFL

- **Source:** ETS official word lists (check copyright)
- **Alternative:** Magoosh TOEFL list (300 words, Creative Commons)
- **Supplement:** Analyze TOEFL practice tests

### IELTS

- **Source:** Cambridge IELTS books (scrape practice tests)
- **Tool:** Frequency analysis of exam passages

### Business English

- **Source:** Business English textbooks (public domain)
- **Categories:** Email, meetings, presentations, negotiation

### Common 3K/9K

- **Source:** Google Books Ngrams
- **Tool:** COCA (Corpus of Contemporary American English)
- **Filter:** Remove K-5 basic words

**Legal note:** For paid tiers, ensure lists are:

1. Public domain
2. Licensed (pay for rights)
3. Original curation (you analyzed tests yourself)

---

## Handling Future Additions

### Adding Idioms (Month 6)

1. Create `foundation_idioms.csv`:

```
word,definition,word_type,example_sentence
"break the ice",Initiate conversation,idiom,"She told a joke to ___ at the meeting."
```

1. Import:

```bash
npx lexicon-tool import --source foundation_idioms.csv --tier foundation --type idiom
```

1. Export (idioms now included)

**No code changes needed** - `word_type` column already exists

### Adding Audio (Month 12)

```bash
npx lexicon-tool enrich --tier toefl --add-audio --provider elevenlabs
# Cost: ~$50 for 600 words
```

**No schema changes** - `audio_path` column already exists

---

## Integration with Mobile App

**On app install:**

1. Bundle `words.db` in `assets/` directory
2. On first launch, copy DB to app's document directory
3. Initialize DB connection via expo-sqlite

**On app update (new word list):**

1. Bundle updated `words.db`
2. On launch, check DB version (`PRAGMA user_version`)
3. If version mismatch, run migrations or replace DB
4. Preserve user data (`user_progress`, `user_entitlements`)

**Two-DB strategy:**

- `content.db`: Read-only, bundled (words, tiers)
- `user.db`: Read-write, user's device (progress, entitlements)
- Join queries via `ATTACH DATABASE`

---

## Next Steps

1. Source initial word lists (Foundation: 800, TOEFL: 600)
2. Build CLI tool (~1 week)
3. Run `build-db.sh`
4. Generate `words.db`
5. Mobile app integrates DB