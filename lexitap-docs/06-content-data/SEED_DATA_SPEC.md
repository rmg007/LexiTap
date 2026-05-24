---
title: Seed Data Spec
category: content-data
status: active
updated: 2026-05-24
priority: P1
tags: [seed-data, word-lists, foundation, advanced, toefl, csv, themes, example-sentences, quality-bar]
---

# Seed Data Spec

Exact specification for the initial launch content that feeds
[./CONTENT_PIPELINE_ARCHITECTURE.md](./CONTENT_PIPELINE_ARCHITECTURE.md). This defines what goes
into the input CSVs *before* enrichment: the corpora, per-field rules, the theme taxonomy, and
the quality bar. The output schema is owned by
[../04-technical-architecture/DATABASE_SCHEMA.md](../04-technical-architecture/DATABASE_SCHEMA.md).

Audience is ESL learners (non-native English speakers) only. Every authoring rule below exists to
serve a learner who does not yet think in English.

## Launch Corpora

The founder already holds three frequency-based corpora (sourcing resolved 2026-05-23 — no
scraping, no licensing). Each maps to one tier:

| Tier slug   | Corpus                                  | Free? | Theme required? | Audio at launch? |
|-------------|-----------------------------------------|-------|-----------------|------------------|
| `foundation`| Top 3,000 most-used English words       | Yes   | Yes             | No               |
| `advanced`  | Words 3,001–9,000 by real-world frequency | Yes | Yes             | No               |
| `toefl`     | 3,000 TOEFL words                       | No    | No (optional)   | Yes (reference)  |

Word counts are **not pre-committed**. The numbers above describe the corpora; the actual shipped
count per tier is whatever survives validation and lands in `content_tiers.word_count` at export.
Expect some attrition (duplicates across tiers, proper nouns, function words that resist a good
example sentence).

### Cross-tier overlap policy

A word may legitimately appear in `foundation` *and* `toefl` (different framing, different example).
IDs are namespaced by tier (`word_<tier>_<hash>`), so this is allowed and not a duplicate. Within a
single tier, duplicate surface forms are rejected by validate.

## How the Corpora Map Into the Import CSV

The founder's corpora are frequency-ranked lists. To become importable they need per-word fields
added. The minimum the founder authors per row is `word`, `definition`, `example_sentence`, and
(for free tiers) `theme`. Everything else is optional or enrichment-generated.

CSV header (matches the pipeline input schema):

```
word,definition,pos,cefr_level,theme,example_sentence,difficulty,word_type
```

Example rows:

```
abundant,Existing in large amounts; more than enough,adjective,B2,Nature & Environment,The forest had an _ supply of fresh water.,3,vocabulary
negotiate,To discuss something in order to reach an agreement,verb,B2,Work & Career,They met to _ the terms of the new contract.,3,vocabulary
"look up to",To admire and respect someone,verb,B1,People & Relationships,Many young players _ their team captain.,2,phrasal_verb
```

Frequency rank itself is not a stored column. If the founder wants to preserve rank for ordering,
it maps to `difficulty` (banded 1–5) or is dropped; the app orders new words by the SRS scheduler,
not by raw frequency.

## Required vs Optional Fields (Per Word)

| Field              | foundation | advanced | toefl | Source |
|--------------------|------------|----------|-------|--------|
| `word`             | required   | required | required | founder corpus |
| `definition`       | required   | required | required | founder-authored (plain English) |
| `example_sentence` | required   | required | required | founder-authored, one blank |
| `theme`            | required   | required | optional | founder-assigned from taxonomy |
| `pos`              | recommended| recommended | recommended | founder or enrichment |
| `cefr_level`       | optional   | optional | optional | descriptive label, not a license |
| `difficulty`       | optional (default 3) | optional | optional | founder banding or default |
| `word_type`        | default `vocabulary` | default `vocabulary` | default `vocabulary` | only set for multi-word |
| `synonyms`/`antonyms` | enrichment | enrichment | enrichment | OpenAI (`enrich --add-synonyms`) |
| `audio_path`       | n/a        | n/a      | enrichment | ElevenLabs/Google (`enrich --add-audio`) |
| `image_path`       | enrichment | enrichment | enrichment | Unsplash curated (`enrich --add-images`) |

Founder authors the left block (word/definition/example/theme/pos); the pipeline fills the
enrichment block. Definitions are NOT enrichment-generated at launch unless the Open Question in
the architecture doc is resolved otherwise.

## Example Sentence Rules

The example sentence is a fill-in-the-blank used by the tap/drag/match widgets, so its shape is
load-bearing, not cosmetic.

1. **Exactly one blank**, written as a single underscore `_`, standing in for the target word.
   Validate rule #2 rejects zero or multiple underscores.
2. The blank is **whitespace-delimited** — `a _ in the reaction`, never `cataly_t`. (`--strict`
   validate warns on an underscore inside a token.)
3. **The blank replaces the whole multi-word unit** for idioms/phrasal verbs:
   `Many young players _ their captain.` for "look up to" — not one blank per token.
4. The surrounding sentence must **disambiguate** the target so the right answer is inferable from
   context by an intermediate ESL learner. Avoid sentences that work equally well with several
   words.
5. **Self-contained and concrete.** No cultural in-jokes, no proper nouns the audience may not know,
   no idioms-within-examples (unless the word *is* the idiom). 6–16 words is the target length.
6. **ESL-register vocabulary in the sentence.** The non-target words should be simpler than the
   target word, so the sentence does not introduce a second unknown word.
7. **One sense per row.** If a word has two common meanings, prefer the higher-frequency sense for
   the example; a second sense is a separate row only if pedagogically necessary.

## Definition Quality Bar

Definitions are written for someone who does not yet think in English.

- **Plain English, no circularity.** Do not define a word with a harder form of itself
  ("abundance: the state of being abundant" is rejected; "abundance: a very large amount of
  something" is accepted).
- **No advanced metalanguage.** Avoid words like "pertaining to," "denotes," "wherein." Use "about,"
  "means," "when."
- **Definitions are in English** (English-only content; see
  [./LOCALIZATION_I18N_STRATEGY.md](./LOCALIZATION_I18N_STRATEGY.md)) but calibrated to roughly one
  CEFR band *below* the target word, so the definition itself is readable.
- **Length:** one clause, ~5–18 words. If it needs two sentences, the second goes in `usage_notes`.
- **Part of speech consistency:** the definition's grammatical form matches `pos` (verbs defined
  with "to ...", adjectives as descriptions, etc.).

## Theme Taxonomy (Foundation and Advanced)

`theme` is **required** for the two free tiers; it drives thematic grouping in the UI and is a
validated enum (validate rule #5 checks non-empty and, in strict mode, membership). Use exactly
these strings:

| Theme                       | Scope |
|-----------------------------|-------|
| `Daily Life`                | Home, food, routines, shopping, time |
| `People & Relationships`    | Family, friends, emotions, social interaction |
| `Work & Career`             | Jobs, workplace, business basics, money |
| `Academic Study`            | School, learning, research, ideas |
| `Health & Body`             | Body, medicine, fitness, wellbeing |
| `Nature & Environment`      | Weather, animals, plants, geography |
| `Science & Nature`          | Physical/biological science concepts |
| `Travel & Places`           | Transport, directions, cities, countries |
| `Technology & Media`        | Devices, internet, communication, news |
| `Society & Culture`         | Government, law, arts, traditions |

Notes:

- Foundation skews toward `Daily Life`, `People & Relationships`, `Health & Body`, `Travel & Places`.
- Advanced skews toward `Academic Study`, `Work & Career`, `Science & Nature`, `Society & Culture`.
- TOEFL does not require a theme (academic register is assumed); if a theme is supplied it must
  still be from this list.
- The taxonomy is closed for launch. Adding a theme is a content-tool config change, not an
  ad-hoc free-text value — keep it enumerable so UI grouping stays stable.

## Multi-Word Entries (Post-Launch Tiers)

Idioms and phrasal verbs are **flat rows in the same CSV/words table** (no separate schema).
Set `word_type` to `idiom` or `phrasal_verb`; the `word` field holds the full string
(`"break the ice"`, `"look up to"`). All example-sentence and definition rules apply unchanged
(single blank replaces the whole unit). These tiers ship post-launch; the seed spec covers them so
the founder can author them in the same workflow.

## Quality Bar and Acceptance

A tier is "seed-complete" when:

1. `validate --strict` passes with **zero errors** (warnings reviewed and accepted).
2. Every free-tier row has a `theme` from the taxonomy.
3. Every row's `example_sentence` has exactly one whitespace-delimited blank.
4. Definitions pass the quality bar above (spot-check at least 5% of each tier by hand).
5. No within-tier duplicate surface forms.
6. After `enrich`, the `build-manifest.json` enrichment coverage matches the launch plan
   (TOEFL audio 100%, synonyms across all tiers, imagery per the free-tier coverage decision).

## Open Questions

- **Definition sourcing.** Whether the founder hand-authors all definitions or the pipeline
  generates drafts for human review (see architecture Open Questions). This spec assumes
  hand-authored/owned definitions at launch.
- **Foundation/Advanced image coverage.** Full vs subset coverage for free tiers (curation-time
  cost, not money) — decide at content build time.
- **Difficulty banding rule.** Whether `difficulty` is derived from frequency rank automatically
  or assigned by hand; default of 3 is acceptable for launch if undecided.
