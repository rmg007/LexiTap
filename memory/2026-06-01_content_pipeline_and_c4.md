---
name: content_pipeline_c4_2026_06_01
description: Content pipeline unblocked (C7 migration + release passes) + C4 definition enrichment DB mode implemented
type: session_notes
date: 2026-06-01
---

# Content Pipeline Fix + C4 Enrichment (2026-06-01)

## What was blocked

`npm run release` aborted with 3,125 errors every run. Three root causes:

1. **working.db schema stale (C7 column missing)** — `applyContentSchema` skips the
   full DDL if `words` table already exists. C7 added `definition_license TEXT` to the
   DDL, but existing working.db never got the column. Validate rule #11 (`!row.definition_license`)
   fired for all 2,881 words.

2. **241 stale audio_path rows** — a prior `enrich --add-audio` run with
   `DeterministicAudioProvider` stamped paths like `assets/audio/{word_id}.mp3` on
   241 words, but no TTS was ever run. Validate rule for asset existence fired on all 241.

3. **3 stub example sentences leaking their own word** — `foundation.csv` rows for
   "the", "is", "answer" all had `The answer is _ .` as their example, which contains the
   word itself → validate rule #10 (exampleLeaksAnswer).

## Fixes (commit `4461b88`)

- `content-tool/src/lib/db.ts` — `applyWorkingDbMigrations(db)` called after
  `applyContentSchema` in `openWorkingDb`. Migration: if `definition_license` column
  missing → `ALTER TABLE words ADD COLUMN` + `UPDATE SET definition_license='original'` +
  `UPDATE SET audio_path=NULL` (clears stale paths). Idempotent.
- `content-tool/src/commands/export.ts` — `bootstrapWorkingForRelease` changed from
  `addAudio: tier.audio` → `addAudio: false`. Prevents future stale paths when working.db
  is rebuilt from scratch. Audio is Phase 3 (C9).
- `content-tool/data/input/foundation.csv` — fixed 5 rows (the×2, is, answer×2) with
  non-leaking example sentences.

**Result:** `npm run release --no-copy` → `release complete: 2881 words, user_version=1`

## C4 Definition Enrichment DB Mode (commit `ed6791c`)

The existing `enrich` CSV mode generated definitions but didn't write back to working.db.
Added a proper DB-mode `--add-definitions` flag:

- `providers/types.ts` — `DefinitionProvider` port + `DefinitionResult` type
- `providers/anthropicDefinitionProvider.ts` — `AnthropicDefinitionProvider`: batches 60
  words/call to `claude-3-5-sonnet-20241022`, fail-closed on API errors, sets
  `definition_license='ai-original'` on write. Requires `ANTHROPIC_API_KEY`.
- `providers/defaultProviders.ts` — `NoopDefinitionProvider` default (CI-safe);
  `--provider anthropic` swaps in `AnthropicDefinitionProvider`;
  `'anthropic'` added to `KNOWN_PROVIDERS`; `ProviderRegistry.definitions` field added.
- `commands/enrich.ts` — `addDefinitions?: boolean` in `EnrichOptions`; `runEnrich()`
  filters TBD-stub rows (`definition.startsWith('(TBD:')`) and batches to the definition
  provider; sets `definition_license='ai-original'`.

**Current DB state:**
- 2,881 words total
- 91 have real (founder-authored) definitions → `definition_license='original'`
- 2,790 still have TBD stubs → need C4 enrichment run

## C4 Run Command (Ryan runs with API key)

```bash
cd content-tool
ANTHROPIC_API_KEY=sk-ant-... npm run cli -- enrich --tier foundation \
  --add-definitions --provider anthropic
# Verify a sample:
sqlite3 data/working/working.db \
  "SELECT word, substr(definition,1,60), definition_license FROM words LIMIT 5;"
# Then release + copy to mobile:
npm run release
```

Cost estimate: 2,790 words × 60 words/batch = ~47 batches × ~2,500 tokens = ~117k tokens
→ roughly $0.35–$0.75 with claude-3-5-sonnet.

## Test Baseline After This Session

- mobile: 338 tests green
- content-tool: 96 tests green (2 new: definition enrichment DB mode)

## Remaining Content Pipeline Gaps

- **C9 audio** (Phase 3): all 9 tier configs have `audio: true` but no TTS run yet.
  `bootstrapWorkingForRelease` now skips audio to prevent stale paths. When C9 lands,
  add real TTS provider and re-enable.
- **C5 validation after C4**: run `npm run release --no-copy` after enrichment to
  verify strict validation passes, then `npm run release` to copy to mobile bundle.
- **mobile words.db**: current bundle has TBD stubs. Do NOT copy until C4 enrichment
  is run and validated. Mobile app renders the stubs but they're bad UX.

## EAS Build Readiness

Everything is in place for a fresh EAS build:
- `eas.json` configured (preview profile, Sentry env vars)
- `app.config.ts` has projectId + owner + appleTeamId
- `icon.png`, `splash.png`, `adaptive-icon.png` all exist
- `SENTRY_AUTH_TOKEN` set as EAS secret (verified `eas env:list production`)

Command:
```bash
cd mobile && eas build --platform ios --profile preview
```
