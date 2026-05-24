---
title: Out-of-Scope Document
category: product
status: active
updated: 2026-05-24
priority: P0
tags: [out-of-scope, non-goals, constraints, scope-discipline]
---

# Out of Scope — LexiTap

Explicit non-goals. This document protects scope discipline: each item is something LexiTap deliberately does NOT do, with rationale and a "revisit when" condition. Some are permanent product boundaries (audience split); others are deferrals with a trigger. Cross-references: [PRODUCT_REQUIREMENTS_DOCUMENT.md](./PRODUCT_REQUIREMENTS_DOCUMENT.md) (scope-outs and non-goals), [FEATURE_BACKLOG.md](./FEATURE_BACKLOG.md) (Won't-this-window items).

## Permanent Boundaries

### American-student vocabulary (SAT/ACT, K-12 grade-level)

- **Rationale:** LexiTap's audience is non-native English speakers only (locked 2026-05-22). American-student vocab is a different audience with different pedagogy and discovery channels; mixing the two dilutes positioning for both. It belongs in a separate product / separate app.
- **Revisit when:** Never as part of LexiTap. If pursued, it ships as a distinct product, not a tier.

### Active production (typing / speaking the word from scratch)

- **Rationale:** The no-typing recognition-only UX is a core differentiator. Production testing requires typing or speaking, both of which conflict with it. For the test-prep audience, recognition is what's tested — the gap is acceptable.
- **Revisit when:** Never within the core quiz loop. Market LexiTap as a vocabulary-mastery tool, not a fluency tool; pair with external production tools.

### Pronunciation training (voice recognition, accent grading)

- **Rationale:** That is ELSA Speak's lane — a separate category with separate infrastructure (expensive voice recognition at scale) and a dominant incumbent. LexiTap's audio is a pronunciation *reference* (hear it said correctly), not training.
- **Revisit when:** Effectively never; it would require entering a different product category.

## Deferred (with trigger)

### AI chatbot / AI tutor

- **Rationale:** Baseline 2026 table-stakes, not a differentiator; WordUp's AI Chat (Lexi/Fantasy) is documented as technologically unstable. Adds cost and instability risk at MVP.
- **Revisit when:** Base product has 10K+ active users and AI/ML integration is planned (backlog #34).

### WordUp-style multimedia (per-word video clips, quote libraries, expert analysis)

- **Rationale:** Enormous content-production undertaking (tens of clips × thousands of words) that would blow the launch budget and push launch out by quarters, competing where WordUp has years of head start. LexiTap captures the dual-coding benefit more cheaply via audio + imagery + curated example sentences.
- **Revisit when:** Post-launch revenue covers a video content budget OR beta data shows a clear conversion lift from richer contextualization. Year 2 at earliest.

### Web app at launch

- **Rationale:** Mobile-first; the 5-minute commute is the atomic engagement unit. A web app splits build effort before the core mobile loop is validated.
- **Revisit when:** Mobile saturates AND a specific platform shows demand signals (backlog #33).

### Productive / family lexical chunking (collocations, word families as active production)

- **Rationale:** LexiTap exercises recognition of meaning, not productive generation of related forms. Active chunking/collocation production conflicts with the no-typing rule and the recognition-only pedagogy. (Recognition-level idioms and phrasal verbs DO ship as post-launch tiers — those are recognition content, not active production.)
- **Revisit when:** Only if a production-capable mode is ever added, which is itself out of scope (see Active production above).

### Full IRT diagnostic

- **Rationale:** Full Item Response Theory needs pre-calibrated difficulty parameters and added onboarding engineering. The simplified adaptive diagnostic (Option B) achieves ~80% of the accuracy for a fraction of the cost and is the right MVP choice (backlog #45).
- **Revisit when:** Cohort data shows diagnostic accuracy is a measurable retention driver post-launch.

### Full localization (translated UI: Spanish, Portuguese, Mandarin, Arabic, etc.)

- **Rationale:** English-only UI is acceptable for an MVP serving motivated ESL learners; localization is significant ongoing effort.
- **Revisit when:** >30% of traffic comes from non-English-primary markets (backlog #31).

## Open Questions

- Idioms and phrasal verbs ship as recognition-only paid tiers post-launch — confirm no item in those tiers implies active production, to stay consistent with the no-typing boundary.
- Apple Sign-In: not a scope-out per se, but its MVP inclusion is undecided (Apple guideline 4.8 may force it once Google Sign-In ships) — tracked in [PRODUCT_REQUIREMENTS_DOCUMENT.md](./PRODUCT_REQUIREMENTS_DOCUMENT.md#open-questions).
