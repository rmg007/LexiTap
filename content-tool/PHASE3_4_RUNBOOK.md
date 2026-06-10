# Phase 3 + 4 Runbook — OpenAI categorize & enrich (JSONL pipeline)

The JSONL content pipeline (see [`plans/CONTENT_PIPELINE_JSONL_PLAN.md`](../plans/CONTENT_PIPELINE_JSONL_PLAN.md))
is driven by two paid OpenAI commands that edit `data/input/words_master.jsonl`
**in place**. Both are resume-safe, require an explicit `--limit`, print a cost
estimate before any call, and support `--dry-run` (constructs no provider, spends
nothing).

> **Key:** uses `OPENAI_API_KEY` from the repo root `.env`. There is no
> Anthropic key in this project — the legacy `enrich-senses` (Anthropic) command
> is NOT the live path. Source the env before running:
> ```bash
> set -a && . ../.env && set +a   # from content-tool/, .env is at repo root
> ```

## Phase 3 — `categorize` (CEFR + specialty tiers)

Per word, the model assigns a CEFR level (A1–C2) and the specialty tiers it
belongs to (`toefl ielts gre gmat business advanced common9k common3k`), MERGED
into the word's `categories` array. It never removes `foundation` or an existing
tier, never emits `foundation`, dedupes + sorts. CEFR from the model overwrites a
word's CEFR (the model is the Phase-3 authority); this closes the legacy
`foundation.csv` CEFR debt (only ~91 of 2,881 words had a CEFR before).

```bash
# Preview selection + cost, spend nothing:
npm run cli -- categorize --limit 3000 --dry-run
# Real run (all words). Default model gpt-4.1-mini (~$0.2 for the full set):
npm run cli -- categorize --limit 3000 --model gpt-4.1-mini
```

Resume: a sidecar `data/input/words_master.jsonl.categorize-done.jsonl` records
finished word_ids; a re-run skips them. `--no-resume` backs up the sidecar and
starts fresh. `--tier <slug>` re-categorizes only words already in that tier.

## Phase 4 — `enrich-master` (senses + 5 questions)

Per word: felt senses (2–4 sentence `explanation` + 2–3 full-sentence examples,
no `_` blank) AND exactly 5 quiz questions — one of each type
(`multiple_choice`, `definition_match`, `fill_blank`, `sentence_order`,
`true_false`), all answered by **tap or drag, never typing**, each with a `hint`
and an `explanation`. Senses (V1–V10) and questions (Q1–Q9) are validated before
writeback; an item that fails any rule is dropped (logged) and the word stays
un-enriched (retry-eligible). Seed-list junk (proper nouns, demonyms, mislabeled
function words, inflections) is skipped with a reason.

```bash
# Pilot a few words first to eyeball quality + the validation pass-rate:
npm run cli -- enrich-master --limit 6 --model gpt-4.1
# Scale up (resume-safe — already-enriched words are skipped automatically):
npm run cli -- enrich-master --limit 3000 --model gpt-4.1
```

Cost scales with `--limit`: ~$0.01/word on `gpt-4.1`, ~$0.0025/word on
`gpt-4.1-mini`. The full ~2,848-word set is ≈ $30 on `gpt-4.1` / ≈ $7 on
`gpt-4.1-mini`. Resume sidecar:
`data/input/words_master.jsonl.enrich-skipped.jsonl` (CONTENT skips excluded
permanently; `provider_error` skips stay retry-eligible).

All generated content is `reviewed: 0`. Ryan flips `reviewed: true` per word
after QA.

## Load → validate → release (after either phase)

```bash
npm run cli -- import-master --source data/input/words_master.jsonl
npm run cli -- validate --strict        # expect 0 errors (warnings are triaged debt)
npm run release                         # rebuild words.db + copy to mobile/assets/vocab/
npm run check                           # lint + typecheck + test must stay green
```
