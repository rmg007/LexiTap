# Session: JSONL pipeline Phases 3 & 4 built on OpenAI — bulk seeding HELD (2026-06-10)

**Commit `edee4ad` → merge `6cda5f1` (main).** 289 content-tool tests green, pushed.

## What shipped (code only)

The repo has `OPENAI_API_KEY` (root `.env`) but **no `ANTHROPIC_API_KEY`** — so the JSONL pipeline's Phase 3 + 4 were built against OpenAI, not the legacy Anthropic `enrich-senses` driver (kept inert as legacy). Two new commands edit `data/input/words_master.jsonl` **in place**, both `--limit`-gated + cost-estimated + `--dry-run` + resume-safe:

- **`categorize`** (Phase 3) — `OpenAiCategorizeProvider` (`gpt-4.1-mini`). Per word → CEFR (A1–C2) + specialty tiers (toefl/ielts/gre/gmat/business/advanced/common9k/common3k), MERGED into `categories` (never drops `foundation`/existing; CEFR-first; dedup+sort). **Subsumes CONTENT-3** — the model does the cross-reference; no external CSV sourcing needed. Closes the legacy `foundation.csv` CEFR debt (only 91/2,881 words had CEFR).
- **`enrich-master`** (Phase 4) — `OpenAiSenseQuestionProvider` (`gpt-4.1`). Per word → felt senses + examples AND exactly 5 click/drag questions (one per type, hint+explanation), validated (senses V1–V10, questions Q1–Q9), fail-closed (invalid item dropped, word stays un-enriched + retry-eligible).
- Shared infra: `providers/openaiClient.ts` (fetch-based Chat Completions, no SDK — global `fetch`; JSON mode; 429/5xx retry; truncation→batch-split; cost table), `commands/master-store.ts` (master IO + `MasterWord→WordRow` + resume sidecars), `commands/question-validators.ts`. Runbook: `content-tool/PHASE3_4_RUNBOOK.md`.

## The key decision — bulk seeding is HELD

Ran a partial `categorize` (~500/2,881 words; CEFR coverage 91→~491, tiers populating sensibly), then **Ryan called it off**: per-word synchronous LLM calls are the wrong unit of work for 2,848 words — **~50 words/min, ≈$7–30 for one Phase-4 pass, multi-hour.** The partial categorize data was **reverted** (a half-categorized master is inconsistent); `words.db` was NOT rebuilt; no generated content shipped.

**The pipeline is the asset; the seeding *engine* is the open question.** Before any full run, pick a scalable strategy:
- **OpenAI Batch API** — ~50% cheaper + async submit/collect (built for exactly this; the `openaiClient` seam makes adding a batch path small).
- **Frequency-prioritized waves** — seed top ~300–500 words first.
- **Many words per call** — denser requests.

⚠️ **Do NOT re-launch the per-word bulk run as-is.** It "works" but is too slow/costly at scale — that's the whole reason it was held. CONTENT-2 in ORCHESTRATION.md is `ready`/owner:ryan, `blocked_by: scalable seeding strategy`.

## Honesty note for the next agent

No ORCHESTRATION task flipped to `done` this session — the CONTENT-2 `verify` (words enriched + `words.db` rebuilt) did **not** happen. What changed is the *tooling* CONTENT-2/CONTENT-3 will use. All generated content, whenever the run happens, lands `reviewed: 0` (Ryan's per-word QA flag).
