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
| `--no-resume` | Start fresh: the existing output (and skip file) are renamed to `<file>.bak-<timestamp>` — never truncated or deleted. The backup happens only AFTER the provider constructs successfully (a missing API key can't destroy a previous paid run). Default: resume. |

Any other `--` flag is a **hard error** — a typo'd flag (e.g. `--dryrun`) aborts
before anything runs instead of silently launching a paid run.

## The skip file (`<output basename>-skipped.jsonl`)

Words the model declines to enrich are persisted to a sibling file next to the
output (default `data/working/senses-enriched-skipped.jsonl`), one JSON object
per line: `{"word_id": ..., "word": ..., "reason": ...}`. Two classes:

| Class | Example reasons | Resume behavior |
|---|---|---|
| **Content skip** | `proper noun (surname)`, `demonym`, `function word`, `inflected form` | Excluded from selection **permanently** — junk stays junk; never re-pay for it. |
| **`provider_error`** | API failure, truncated response | **Retry-eligible** — re-selected on the next run. |

The run summary prints both counts separately. Review the content-skip list
after a run; to force a content-skipped word back in, delete its line from the
skip file.

## Behavior to rely on

- Words with existing senses are never re-enriched; interrupted runs resume
  (output is appended after every 8-word batch). A run interrupted mid-append
  leaves a partial final line — the next run truncates it back to the last
  complete line automatically, and that word is simply re-enriched.
- The working DB is opened **read-only**. If it doesn't exist, the command
  fails with a pointer to the import/release pipeline — it is never silently
  created empty (which would report "nothing to enrich").
- Seed-list junk (proper nouns, demonyms, inflections) is SKIPPED by the model
  with a reason — persisted to the skip file (see above), don't pay to dress
  it up.
- A model response cut off at `max_tokens` is never repair-retried (guaranteed
  to fail) — the batch is split in half and each half retried; a single word
  that still truncates lands in the skip file as `provider_error`.
- Every item is validated (V1–V10) before it reaches the file; invalid model
  output is dropped, never written. An item whose returned `word` doesn't
  match the requested word for that `word_id` (identity swap) is also dropped.
- Cost estimate is APPROXIMATE (~1.3k in / ~750 out tokens per word). 300 words
  on Opus ≈ $7.6. Decision points: N (start 300), model (Opus), budget cap.
