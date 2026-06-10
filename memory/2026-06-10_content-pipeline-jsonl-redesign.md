# Session: Content Pipeline JSONL Redesign decisions (2026-06-10)

## Context

Started CONTENT-2 (sense enrichment run, 300 words, ~$7.58). During dry-run review, Ryan identified
three deeper structural problems with the existing pipeline that must be fixed first:

1. Specialty tier CSVs are stubs (5–10 words each) — never properly cross-referenced against the 2,848 foundation words
2. CEFR level and tier membership are the same kind of label; splitting them is unnecessary complexity
3. CSV can't represent nested data (word → senses → examples) — the split between CSV import and JSONL ingest-senses was a workaround

## Decisions made

**Drop all CSV input files. Use a single `words_master.jsonl` as the source of truth.**

- One JSON object per line, one line per word
- `categories` array replaces both `cefr_level` column and separate tier CSVs — contains CEFR level + all tier slugs (e.g. `["B2", "foundation", "toefl", "ielts"]`)
- Import pipeline routes: CEFR values → `words.cefr_level`, tier slugs → `word_tiers`
- `senses: []` for un-enriched words; enrichment populates in-place

**Add `reviewed` boolean — in both JSONL and DB (`words.reviewed INTEGER DEFAULT 0`).**
- Ryan marks a word reviewed after checking: definition, senses, questions, audio
- Toggleable (true → false) so words can be re-reviewed after content updates

**No new words for now.**
- 2,848 foundation words is the scope until fully seeded
- Seeding cost: explanation + examples per sense + ~20–30 quiz questions + audio + maybe images/video per word
- Expanding the word list before the existing words are complete wastes effort

**Cross-reference specialty tiers against existing 2,848 words — don't add new words, just tag.**
- Many foundation words already belong to TOEFL, IELTS, GRE, GMAT, business, advanced
- Identify overlaps, add tier slugs to their `categories` arrays
- Requires authoritative specialty word lists (Ryan to provide or approve sources)

## What's on hold

**CONTENT-2 enrichment run is blocked** on Phase 1–2 of the JSONL pipeline rewrite. Running enrichment on the old pipeline and then migrating would mean migrating enriched data — do the pipeline first.

## Full plan

See [`plans/CONTENT_PIPELINE_JSONL_PLAN.md`](../plans/CONTENT_PIPELINE_JSONL_PLAN.md).

## Worktree state

Work is on branch `content2` in `../lexitap-content2`. Working.db was copied from main. No code changes made this session — decisions only.
