---
title: C5 — QA Checklist for Word Enrichment (C4)
status: active
created: 2026-05-31
purpose: Establish a lightweight quality bar before full C4 enrichment run (3,000 words)
---

# C5 — QA Checklist for Word Enrichment

**Objective:** Validate that C4 (OpenAI/Anthropic enrichment) produces definitions and examples that meet ESL pedagogical standards.

## Definition Quality Criteria

Each enriched `definition` field must pass ALL of the following:

| # | Criterion | Pass | Fail | Notes |
|---|-----------|------|------|-------|
| **D1** | **Length:** 1–2 sentences max | "happy: feeling or showing pleasure" | "happy: a state of mind characterized by contentment, satisfaction, and positive emotional responses to external stimuli" | Avoid encyclopedic multi-clause definitions. CEFR A2-B1 learners need brevity. |
| **D2** | **Vocabulary level:** A2-B1 max | "abandon: to leave someone or something" | "abandon: to discontinue utilization and relinquish custodianship" | Use only common, high-frequency words. No C1+ synonyms unless unavoidable. *Check: every content word should be in top 3k frequency*. |
| **D3** | **Clarity:** Explains the word meaningfully without relying on the word itself | "apple: a round fruit that is usually red or green and grows on a tree" | "apple: an apple is a thing that is an apple-like object" (circular) | Must offer a recognizable picture of what the word means. |
| **D4** | **Accuracy:** Semantically correct in standard English | "run: to move quickly on foot" | "run: to sit or stand in one place" | Definition must match common dictionary definitions. Regional variants OK if clearly labeled. |
| **D5** | **No PII/cultural bias:** Avoids names, locations, sensitive topics | "teacher: a person who educates students" | "teacher: John, who is American and teaches in Texas" | Keep definitions universal and appropriate for global ESL learners (ages 13+). |

## Example Sentence Quality Criteria

Each enriched `example_sentence` field must pass ALL of the following:

| # | Criterion | Pass | Fail | Notes |
|---|-----------|------|------|-------|
| **E1** | **Blank count:** Exactly one `_` | "She is _ very happy about the news." | "She is _ very _ about the news." (2 blanks) or "She is very happy about the news." (0 blanks) | The blank must be in place of the target word. |
| **E2** | **Blank position:** Blank replaces target word only | "She is _ happy about the news." (blank=is) | "She is happy _ the news." (blank=about) | After enrichment, learners replace `_` with the word. The blank is not a distractor. |
| **E3** | **Naturalness:** Reads like real English | "The meeting will be held next Tuesday." | "The meeting will be held at next Tuesday time." | Sentence must be grammatically correct and sound natural to a native speaker. |
| **E4** | **Context clue:** Word's meaning is inferable from the sentence | "He had to _ the company because of family reasons." (definition: leave) | "The _ is under the table." (definition: cat) — missing context | Learner should be able to infer the word's meaning from other clues in the sentence. Avoid opaque or circular clues. |
| **E5** | **Vocabulary level:** A2-B1 max | "The student finished her homework on time." | "The perspicacious scholar completed her didactic obligations expeditiously." | All words except the blank should be comprehensible to A2-B1 learners. |
| **E6** | **No PII/cultural bias:** Avoids names, locations, sensitive topics | "Mary studied for the exam." | "Kim Jong-un visited North Korea." | Keep examples culturally neutral and globally appropriate. Real names (especially proper nouns) are acceptable only if they are common reference points (e.g., "I love Paris" for geography context). |

## Scoring

- **Pass:** Definition AND example both pass all criteria (D1–D5 + E1–E6).
- **Fail:** Either definition OR example fails ≥1 criterion.
- **Target compliance:** ≥85% pass on sample (10–15% of 3,000 words = 300–450 words).
  - ≥85% → proceed to full enrichment run (C4 full).
  - 70–84% → review failures, iterate C4 prompt, retry sample.
  - <70% → fundamental issue with enrichment strategy; escalate.

## Failure Patterns to Document

When a word fails, categorize it to identify systemic issues:

- **D-series failure:** Definition issue (vocabulary, clarity, accuracy, etc.)
- **E-series failure:** Example issue (blank placement, unnatural English, missing context, etc.)
- **Both:** Definition AND example broken (high-priority fix).

Example log entry:
```
Word: "ephemeral"
Definition: "Lasting a very short time"  [PASS: D1, D2, D3, D4, D5]
Example: "The _ moment was unforgettable."  [FAIL: E4 (context clue insufficient)]
Result: FAIL (E-series)
```

## Checklist for Sample Run (qa-sample.sh)

1. ✅ Pick 300 random words from foundation.csv (10% of 3,000)
2. ✅ Run C4 enrichment on the sample
3. ✅ Manually review 20–30 definitions + examples (stratified: A2, B1, mixed)
4. ✅ Mark pass/fail per word, categorize failures
5. ✅ Calculate compliance % (pass / total)
6. ✅ Document findings in `QA_SAMPLE_RESULTS.md`
7. ✅ Decision: proceed to C4-full if ≥85%; iterate if <70%; escalate if <70%

---

## Command Reference

```bash
# Run sample validation (see qa-sample.sh)
cd content-tool
npm run qa:sample

# After fixing C4 prompt, re-run to verify
npm run qa:sample -- --retry

# Full run (only after sample ≥85%)
npm run enrich -- --input data/input/foundation.csv --output data/output/foundation-enriched.csv --budget 100
```

---

**Last updated:** 2026-05-31
