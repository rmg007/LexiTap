---
title: Onboarding Flow Spec
category: ux-design
status: active
updated: 2026-05-24
priority: P0
tags: [onboarding, first-run, diagnostic, adaptive, knowledge-map, srs-seeding, endowed-progress, irt]
---

# Onboarding Flow Spec

Detailed specification of LexiTap's first-run adaptive diagnostic and Knowledge Map reveal. This is the resolved approach for backlog #45 ([FEATURE_BACKLOG.md](../02-product-definition/FEATURE_BACKLOG.md)): a **simplified adaptive diagnostic** that approximates a computerized adaptive test, leverages the endowed-progress effect for D1 retention, and seeds initial SRS state — without the engineering cost of full IRT at MVP.

This expands the high-level onboarding flow in [USER_FLOWS.md](./USER_FLOWS.md) flow 1 and the wireframes in [WIREFRAMES_MOCKUPS.md](./WIREFRAMES_MOCKUPS.md). Visual tokens from [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md); screen-reader handling from [ACCESSIBILITY_REQUIREMENTS.md](./ACCESSIBILITY_REQUIREMENTS.md).

## Table of Contents

- [Goals and Constraints](#goals-and-constraints)
- [IRT Decision: Resolved Simplified, Full IRT Deferred](#irt-decision-resolved-simplified-full-irt-deferred)
- [Stage 1: Self-Segmentation](#stage-1-self-segmentation)
- [Stage 2: Adaptive Yes/No Item Selection](#stage-2-adaptive-yesno-item-selection)
- [Stage 3: Pseudo-Word Overclaim Detection](#stage-3-pseudo-word-overclaim-detection)
- [Stage 4: SE-Based Stopping Rule](#stage-4-se-based-stopping-rule)
- [Stage 5: Knowledge Map Reveal](#stage-5-knowledge-map-reveal)
- [Stage 6: Seeding Initial SRS State](#stage-6-seeding-initial-srs-state)
- [Worked Example](#worked-example)
- [Edge Cases](#edge-cases)
- [Open Questions](#open-questions)

## Goals and Constraints

1. **Place the learner** on a vocabulary-knowledge band quickly (~10–25 items, target < 2 minutes).
2. **Maximize self-efficacy** via the endowed-progress effect — show the learner how many words they already know (the WordUp Knowledge Map insight, [PRODUCT_REQUIREMENTS_DOCUMENT.md](../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md)).
3. **Resist overclaiming** with pseudo-word probes (signal-detection correction).
4. **Seed the SRS** so the first real sessions are well-targeted, not random.
5. **No typing** — every response is a tap (Yes/No, choice). Honors the core invariant.
6. **Non-punitive** — the diagnostic never feels like a test you can fail; framing is "let's find your starting point."

## IRT Decision: Resolved Simplified, Full IRT Deferred

**Status: RESOLVED — simplified adaptive at MVP. Full Item Response Theory deferred post-launch.**

- The fork in Backlog #45 was full IRT (3-parameter logistic, calibrated item bank, maximum-information item selection, MLE/EAP ability estimation) vs. a simplified adaptive scheme.
- **Decision: simplified adaptive.** It delivers ~80% of the placement accuracy at a fraction of the engineering and content-calibration cost. Full IRT requires a calibrated item bank (item difficulty/discrimination parameters estimated from large response samples) that LexiTap does not have at launch.
- **Simplified scheme:** words are bucketed by **frequency rank** as a difficulty proxy (frequency rank is already the content backbone — Foundation = top 3,000, Advanced = 3,001–9,000). The diagnostic walks up/down frequency bands by a step rule rather than computing item information.
- **Revisit trigger:** post-launch, once enough real response data exists to calibrate an item bank, full IRT (or a 1-parameter Rasch model as a middle step) can replace the band-walk. Until then, simplified is the locked MVP approach.

## Stage 1: Self-Segmentation

A single tap-only screen that sets the diagnostic's **starting frequency band**, so we do not waste items establishing rough level.

Options → starting band:

| User selection | Starting band (frequency rank) |
|----------------|--------------------------------|
| "Just starting" | ~rank 500 (high-frequency, easy) |
| "I get by" | ~rank 1,500 |
| "I'm advanced" | ~rank 4,000 |
| "Prepping for a test" | ~rank 4,000 + flags test interest (for later tier suggestion) |

This is self-report only and is treated as a prior, not ground truth — the adaptive walk and pseudo-words correct it. "Prepping for a test" also lightly informs post-onboarding paywall suggestions but never forces a purchase.

## Stage 2: Adaptive Yes/No Item Selection

Core loop. Each item presents one real word and asks "Do you know this word?" with a quick confirmation check to make the Yes meaningful.

Two-step item to make "Yes" honest (cheap, no typing):
1. **Self-claim:** tap **Yes** ("I know it") or **No** ("I don't").
2. **Confirm-on-Yes:** if Yes, show a fast 3-option MultipleChoice meaning check for that word. A correct check confirms knowledge; an incorrect check converts the item to "claimed but not known" (counts against the self-report, similar to a pseudo-word miss). A **No** self-claim skips the check (we trust "I don't know it").

Band-walk selection rule (the simplified-adaptive engine):
- Maintain a current difficulty pointer = frequency rank.
- **Confirmed-known** (Yes + correct check) → move to a **harder** band (increase rank by the current step).
- **Not-known** (No, or Yes + failed check) → move to an **easier** band (decrease rank by the current step).
- **Step size halves** on each direction reversal (a staircase / bracketing method), so the pointer converges on the boundary between known and unknown — the learner's vocabulary "frontier."
- Draw the specific word for an item randomly from within the target band to avoid memorized sequences.

This converges on the frontier rank in roughly 8–20 items for most learners.

## Stage 3: Pseudo-Word Overclaim Detection

Seed **2–3 pseudo-words** (plausible non-words, e.g. "morptive," "blantery") among the real items, presented identically (not visually flagged — see [WIREFRAMES_MOCKUPS.md](./WIREFRAMES_MOCKUPS.md)).

- A pseudo-word has no real meaning, so a confident "Yes, I know it" is a **false alarm** — direct evidence of overclaiming.
- Apply a signal-detection correction: estimated known-rank is **discounted** in proportion to the pseudo-word false-alarm rate.
  - 0 false alarms → no correction.
  - 1 of 3 → modest downward correction.
  - 2–3 of 3 → strong correction; cap the estimate conservatively and lean on the No/failed-check signals over self-claims.
- The confirm-on-Yes check (Stage 2) already catches most overclaiming on real words; pseudo-words catch the residual "yes to everything" pattern and calibrate trust in the self-report channel overall.

Pseudo-words are placed mid-sequence (not first, not last) and never count toward the Knowledge Map "known" total.

## Stage 4: SE-Based Stopping Rule

Stop the diagnostic when the estimate is precise enough, rather than at a fixed length.

- Track a running estimate of the frontier rank and its **standard error (SE)** — in the simplified scheme, SE is approximated from the width of the current staircase bracket (the gap between the highest confirmed-known band and the lowest not-known band) plus the pseudo-word correction uncertainty. A narrow bracket = low SE.
- **Stop when** the bracket width falls below the SE threshold (estimate is stable) **OR** the hard item cap (25) is reached, whichever comes first. **Minimum** 10 items so very early convergence still feels credible and gives enough words for the Knowledge Map.
- Typical session: ~10–25 items.

## Stage 5: Knowledge Map Reveal

The payoff screen — the endowed-progress moment. This is the one place the design system permits a celebratory motion beat ([DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md), `motion.slow`; degrades to static under Reduce Motion per [ACCESSIBILITY_REQUIREMENTS.md](./ACCESSIBILITY_REQUIREMENTS.md)).

- Convert the estimated frontier rank into an **estimated known-word count**: every word below the frontier rank (within the active free tiers) is treated as "already known," adjusted by the pseudo-word correction. Words above the frontier are "to learn."
- Reveal a segmented bar: **Known** (`success`) · **Learning** (`accent`, the frontier band actively in play) · **New** (`text.tertiary`).
- Copy leans into endowed progress: "You already know about 1,840 words. Let's build from there." Never frame the remainder as a deficit ("you don't know 1,160").
- CTA: **Start learning** → Home, with the SRS already seeded (Stage 6).

## Stage 6: Seeding Initial SRS State

The diagnostic's purpose beyond motivation is a warm-started SRS so the first sessions are well-targeted. Seeding uses the SRS model in [SYSTEM_ARCHITECTURE.md](../04-technical-architecture/SYSTEM_ARCHITECTURE.md) (`masteryLevel` 0–5, interval ladder `[1,3,7,14,30]`).

Per word, by its position relative to the estimated frontier rank:

| Band relative to frontier | Seeded mastery | First review |
|---------------------------|----------------|--------------|
| Well below frontier (clearly known) | high (e.g. 3–4) | longer interval (7–14 d) — light confirmation later |
| At/near frontier (Learning) | low (e.g. 1) | soon (1–3 d) — these are the active learning edge |
| Above frontier (New) | 0, not yet introduced | enters via "Learn new words" flow, not pre-scheduled |

- Words directly answered in the diagnostic seed from their **actual** result (confirmed-known → higher mastery; not-known → low/zero), overriding the band heuristic for those specific words.
- Seeding writes initial `user_progress` rows (mastery + next_review_date). The SRS append-only invariant holds: these are initial states, not retroactive edits.
- Net effect: day-one review queue is concentrated at the learner's frontier — the highest-leverage words — instead of random or all-from-zero.

## Worked Example

Learner selects "I get by" (start ~rank 1,500). Staircase: knows 1,500 → up to 2,500 (step 1,000); knows 2,500 → up to 3,500; fails 3,500 → reversal, step halves to 500, down to 3,000; knows 3,000 → up 250 to 3,250; fails 3,250 → bracket [3,000 known, 3,250 not-known], width 250 < threshold → **stop at 14 items**. One pseudo-word presented, correctly answered "No" → no correction. Frontier ≈ rank 3,100. Knowledge Map: "~3,100 words known." SRS seeds ranks <2,800 at high mastery/long interval, the 2,800–3,300 band at mastery 1 / review in 1–3 days, ranks >3,300 left as New.

## Edge Cases

- **Quits mid-diagnostic:** persist answered items; resume from the next item on relaunch. If they skip onboarding entirely, fall back to the self-segmentation band as a flat placement and seed conservatively.
- **All pseudo-words failed (claims to know non-words):** treat self-claims as unreliable; weight No/failed-check signals, cap the known estimate low, and present an encouraging Knowledge Map without an inflated number.
- **Hits item cap without converging** (inconsistent answers): use the best central estimate of the bracket and widen the "Learning" band so more words start in active review.
- **Very low level** ("Just starting," fails early easy items): stop fast at the minimum 10 items; Knowledge Map celebrates the small known set honestly and emphasizes the path forward.
- **Test-prep selector:** after the Map, optionally surface a relevant paid tier suggestion (e.g. TOEFL) as an invitation, routed through the Paywall flow ([USER_FLOWS.md](./USER_FLOWS.md) flow 5) — never a hard gate.

## Open Questions

- **Pseudo-word library:** need a small vetted set of plausible non-words that are not real words in major L1s of the audience (to avoid false "known" hits); owned by content pipeline.
- **Exact thresholds:** starting ranks, step sizes, SE/bracket threshold, and seed mastery values above are reasoned defaults; tune against beta data.
- **Confirm-on-Yes check load:** the meaning-check on every Yes adds items; confirm this is acceptable vs. sampling only some Yes claims for the check to keep the diagnostic short.
