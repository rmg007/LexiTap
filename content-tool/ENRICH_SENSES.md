# CONTENT-2 — Rich-sense enrichment run (owner guide)

One command turns the working DB's top-N words into rich multi-sense teaching
content (felt explanations + full-sentence examples), written to a JSONL file
that `ingest-senses` loads. Quality bar = `data/input/sample-senses.jsonl`
(hand-approved exemplars are embedded in the prompt verbatim).

## Run it

```bash
cd content-tool
export ANTHROPIC_API_KEY=sk-ant-...        # never commit; shell env only

# 1. ALWAYS dry-run first — prints selection + estimated cost, $0 spent:
npm run enrich:senses -- --limit 300 --dry-run

# 2. Real run (recommended starting point — top 300 by frequency, Opus):
npm run enrich:senses -- --limit 300 --model claude-opus-4-8

# 3. Load the results into the working DB:
npm run cli -- ingest-senses --source data/working/senses-enriched.jsonl

# 4. Validate, then rebuild + re-bundle words.db:
npm run cli -- validate --strict           # expect 0 errors (~2802 known warnings)
npm run release                            # builds + copies words.db to mobile/assets/vocab/
```

## Flags

| Flag | Meaning |
|---|---|
| `--limit <n>` | REQUIRED. Max words this run (prevents accidental whole-DB spend). |
| `--tier <slug>` | Restrict to one tier (e.g. `foundation`). |
| `--model <id>` | Default `claude-opus-4-8`. Cheap bulk models produce slop on "feel it" — stay on Opus. |
| `--output <path>` | Default `data/working/senses-enriched.jsonl`. |
| `--dry-run` | Selection + cost estimate only; no API key needed. |
| `--no-resume` | Start a fresh output file (default: resume — already-enriched word_ids are skipped). |

## Behavior to rely on

- Words with existing senses are never re-enriched; interrupted runs resume
  (output is appended after every 8-word batch).
- Seed-list junk (proper nouns, demonyms, inflections) is SKIPPED by the model
  with a reason — review the skip list, don't pay to dress it up.
- Every item is validated (V1–V10) before it reaches the file; invalid model
  output is dropped, never written.
- Cost estimate is APPROXIMATE (~1.3k in / ~750 out tokens per word). 300 words
  on Opus ≈ $7.6. Decision points: N (start 300), model (Opus), budget cap.
