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

## Vocabulary Accuracy QA Checklist

This checklist exists because LexiTap makes explicit exam-preparation claims. An incorrect definition on a TOEFL word a student studies and then gets wrong on the actual ETS exam is a product liability issue, not just a quality miss. Run this before setting `is_active = 1` on any paid tier.

### Reference Authorities by Tier

| Tier | Authoritative cross-reference sources |
|------|---------------------------------------|
| `foundation` / `advanced` | Oxford Learner's Dictionary (oxfordlearnersdictionaries.com); Cambridge Learner's Dictionary; Macmillan Dictionary (designed for ESL/EFL learners — not native-speaker dictionaries) |
| `toefl` | ETS Official Guide to the TOEFL Test (sample vocabulary); Academic Word List (AWL, Coxhead 2000 — 570 word families that account for ~10% of TOEFL academic text); Oxford Phrasal Academic Lexicon (OPAL) |
| `ielts` | Official Cambridge Guide to IELTS; Cambridge English Vocabulary Profile (EVP — maps words to CEFR bands B1–C2); Collins COBUILD Advanced Learner's Dictionary |
| `business` | Longman Business English Dictionary; Cambridge Business English Dictionary |
| `gre` / `gmat` | Merriam-Webster's Collegiate Dictionary and ETS GRE Vocabulary in Context materials used as **reference authorities only** — definitions must be independently authored, never copied verbatim (see content QA gate below). |
| `idioms` / `phrasal_verbs` | Macmillan Phrasal Verbs Plus; Cambridge Idioms Dictionary; COCA (corpus.byu.edu) for frequency confirmation |

### Per-Word QA Checks

For a **5% random sample** of each tier (minimum 50 words, or all words if tier < 100):

- [ ] **Definition accuracy** — definition matches the primary sense given in the reference authority for this tier. Flag any where LexiTap's definition describes a secondary or rare sense as if it were primary.
- [ ] **Definition register** — definition language is at least one CEFR band simpler than the target word (e.g., a C1 word is defined using B1/B2 vocabulary). No "pertaining to," "wherein," "denotes."
- [ ] **No copyright verbatim copy** — definition is paraphrased in the author's own words. Direct copy from any published dictionary is a licensing violation. The definition must be functionally equivalent but not word-for-word identical.
- [ ] **Example sentence naturalness** — sentence sounds like natural English. Run suspect sentences through a corpus check (COCA: corpus.byu.edu — free, no account required) to confirm the phrase pattern appears in real usage.
- [ ] **Example sentence disambiguates the target** — the sentence context strongly implies the target word. A test: could a B2 learner guess the right answer from the context alone? If multiple unrelated words fit the blank equally well, rewrite.
- [ ] **CEFR level plausibility** — if `cefr_level` is set, it should match the Cambridge EVP band (±1 band is acceptable; a B1 label on a C2 word is a flag).
- [ ] **Multi-word entry integrity** (idioms/phrasal verbs only) — confirm the phrase is in common use by checking COCA frequency > 10 occurrences per 100M words. Archaic or regional idioms should be flagged.
- [ ] **No culturally narrow examples** — example sentences must not rely on US-specific cultural references (sports, celebrities, institutions) that a learner in Vietnam, Brazil, or Egypt would not recognize. The audience is global APAC/ESL-dominant.

### Audio QA Checks (TOEFL tier and any premium audio tier)

For **100% of audio files** before the tier publishes:

- [ ] **Pronunciation correct** — the generated audio matches the standard reference pronunciation. Cross-check stress pattern against Merriam-Webster (US accent) or Oxford (UK accent) as labeled.
- [ ] **No artifacts** — no clipping, background noise, unintended silence longer than 0.3s at start/end, or robotic prosody severe enough to confuse a learner.
- [ ] **Accent label matches audio** — if `audio_path` encodes `_us` or `_gb`, the accent delivered matches the label.
- [ ] **Multi-word entries pronounced as a unit** — phrasal verbs and idioms are pronounced as complete phrases, not word-by-word with unnatural pausing.

### Pre-Publication Sign-Off

Before calling a tier seed-complete and running `export`:

1. Founder reviews QA sample report (document pass/fail counts in `data/working/qa-log-<tier>-<date>.md`).
2. All **errors** (wrong definition, misleading example, broken audio) are fixed before publication.
3. **Warnings** (minor naturalness issues, borderline CEFR level) are documented and accepted or fixed at the founder's discretion.
4. QA log is committed alongside the `build-manifest.json` so future content updates have a baseline.

## Human-in-the-Loop Definition Quality Protocol

To ensure LexiTap vocabulary definitions are highly readable for global ESL learners and fully clear of dictionary copyright infringement, the content tool uses this **Human-in-the-Loop Definition Sourcing and QA Protocol**:

### 1. AI-Assisted Original Generation Prompt (OpenAI)
If a definition is not pre-supplied by the founder's frequency files, the pipeline leverages OpenAI to draft a custom definition using this specific prompt boundary to ensure original, plain-English phrasing:
```
Define the English vocabulary word "{word}" as used in a {pos} grammatical part of speech.
The definition MUST:
1. Be written for intermediate (CEFR B1) ESL English learners.
2. Be between 5 and 15 words in length.
3. Be a completely original paraphrasing. DO NOT copy verbatim from Merriam-Webster, Oxford, Cambridge, or Collins.
4. Avoid advanced metalanguage (strictly do not use "pertaining to", "denotes", "wherein", or "characterised by").
5. Define verbs starting with "To", adjectives as direct descriptions, and nouns as plain objects or concepts.
```

### 2. Sourcing Verification Pipeline
1.  **Import Command:** CLI parses the CSV. Any row lacking a definition is imported into `working.db` with `definition_status = 'pending_generation'`.
2.  **Enrich Command (`--add-definitions`):** CLI processes `pending_generation` rows through OpenAI using the prompt above. Generates original definitions and sets `definition_status = 'pending_review'`.
3.  **Human Editorial Sweep:** The founder reviews generated rows. The CLI tool exposes an interactive review command: `npx lexitap-tool review-definitions --tier <tier>`. It renders each word, the proposed definition, and the example sentence. Founder approves (sets `definition_status = 'approved'`) or types a custom definition inline.
4.  **Export Gate:** The `validate` and `export` commands strictly require `definition_status = 'approved'` for all active content rows. Exporting unverified AI content to the final `words.db` bundle is technically blocked.

## Open Questions

- `requires-product-decision` — **Foundation/Advanced image coverage.** Full vs subset coverage for free tiers (curation-time cost, not money) — decide at content build time.
- `requires-product-decision` — **Difficulty banding rule.** Whether `difficulty` is derived from frequency rank automatically or assigned by hand; default of 3 is acceptable for launch if undecided.
