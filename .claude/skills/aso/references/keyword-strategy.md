# Keyword Strategy — LexiTap

Goal: find terms with **high relevance** to LexiTap × **reachable difficulty** (don't fight Duolingo for "learn english" head term on day one — win the long tail and exam niches).

## How to research (vetted method — no scraping tools)

1. **Seed** from LexiTap's value props (below).
2. **Expand** with `WebSearch`: App Store autocomplete patterns, "best apps for X", Reddit/forum language (r/EnglishLearning, r/TOEFL, r/IELTS) — how learners actually phrase their need.
3. **Estimate difficulty qualitatively**: head terms ("learn english", "vocabulary") = high difficulty, owned by incumbents. Long-tail + exam + mechanism terms = winnable.
4. **Score each keyword** on two axes you can actually justify — *Relevance* (does LexiTap genuinely deliver this?) and *Reachability* (can a new app rank?). **Never fabricate a numeric "volume"** you didn't measure; label estimates as estimates.
5. **Assemble** the Apple 100-char field from the best *atoms* (Apple recombines them) — see platform-rules.

## Seed keyword pools

**Core (high relevance, high difficulty — use in title/subtitle, not wasted in keyword field):**
`learn english`, `english vocabulary`, `vocabulary builder`, `english words`, `ESL`

**Mechanism / differentiator (medium difficulty, high intent — strong fit):**
`spaced repetition`, `flashcards english`, `word memorization`, `vocabulary practice`, `offline english`, `CEFR`, `frequency words`, `adaptive learning`

**Exam niches (LOWER difficulty, HIGH intent, monetization-aligned — prioritize):**
`TOEFL vocabulary`, `IELTS vocabulary`, `TOEFL words`, `IELTS words`, `exam english`, `english test prep`, `academic english`, `business english vocabulary`

**Audience / level (long tail):**
`english for beginners`, `intermediate english`, `english B1 B2`, `english for adults`, `daily english words`, `improve english`

**Avoid:** competitor brand names; `app`/`the`/category words; American-K12 terms (SAT/elementary — wrong audience).

## Competitor map (for positioning + review mining — never name them in metadata)

| Competitor | Their angle | LexiTap's wedge against them |
|---|---|---|
| Duolingo | Gamified general courses | Vocabulary-depth + **offline** + **exam-targeted** + no forced gamification |
| Memrise / Drops | Vocab w/ spaced repetition | **Adaptive placement** (no manual level pick) + CEFR/frequency rigor + offline |
| Anki / Quizlet | DIY flashcards | **Curated, ranked, ready** content — no deck-building chore |
| Magoosh / exam-vocab apps | Exam word lists | Same exam focus **plus** general fluency path + SRS + offline, **pay-once** packs |
| Vocabulary.com | Adaptive English vocab | Built for **ESL** specifically (not native speakers), offline, exam packs |

Pull these competitors' **reviews** (`references/review-management.md`) to mine the exact phrases learners use and the gaps they complain about → those become keywords + description copy.

## Localization (highest-ROI Apple lever)
Localize the **keyword field** (and ideally subtitle) per storefront for top ESL markets: `es`, `pt-BR`, `ja`, `ko`, `zh-Hans`, `ar`, `tr`, `vi`, `id`, `fr`, `de`, `ru`, `th`. Learners search in their native language for "aprender inglés", "学习英语单词", "تعلم الانجليزية", etc. The UI can stay English-only; only the store metadata is localized. This roughly multiplies indexed terms with no app changes.

## Deliverable
A ranked table (keyword | relevance H/M/L | reachability H/M/L | placement: title/subtitle/keyword-field/description) **plus** the final assembled Apple keyword field with a character count.
