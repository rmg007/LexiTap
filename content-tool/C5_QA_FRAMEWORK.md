---
title: C5 — QA Framework Documentation
status: active
created: 2026-05-31
purpose: Complete guide to validating C4 enriched definitions before full production run
---

# C5 — QA Framework for C4 Word Enrichment

This document describes the lightweight QA framework for validating C4 (Claude-based definition enrichment) before running it at full scale (3,000+ words).

## What Is C5?

**C5** is a quality assurance gate between **C3** (source word lists) and **C4** (enrichment via Claude).

The goal: **Establish a quality baseline with 10–15% of words before enriching all 3,000+.**

- ✅ Pick 300 random words from foundation.csv
- ✅ Run C4 enrichment on the sample
- ✅ Validate definitions & examples against a 12-point checklist
- ✅ Calculate compliance %
- ✅ Decision: proceed to full C4, iterate on prompt, or escalate

## Framework Components

### 1. QA_CHECKLIST.md

Defines 12 pass/fail criteria across two categories:

**Definition (D1–D5):**
- D1: 1–2 sentences, <60 words
- D2: A2-B1 vocabulary only
- D3: Clear, non-circular
- D4: Semantically accurate
- D5: No PII, culturally neutral

**Example (E1–E6):**
- E1: Exactly 1 blank (_)
- E2: Blank replaces the target word
- E3: Natural English, 8–20 words
- E4: Context clue present (can infer meaning)
- E5: A2-B1 vocabulary only
- E6: No PII, culturally neutral

**Scoring:** Word passes if definition AND example both pass all criteria. Target: ≥85% compliance.

### 2. qa-sample.ts

Node.js/TypeScript script that:

1. **Loads** foundation.csv (3,000 words)
2. **Samples** N random words (default: 300 = 10%)
3. **Enriches** via Claude API in batches (30 words/batch)
4. **Validates** each word against the checklist
5. **Reports** pass/fail counts and detailed results

Key features:
- Seeded random sampling for reproducibility (--seed option)
- Batch cost estimation upfront
- Graceful handling of API failures (resume on next batch)
- Exports enriched sample to CSV for manual spot-check
- Generates QA_SAMPLE_RESULTS.md with findings

### 3. QA_SAMPLE_RESULTS.md (generated)

Template report showing:
- **Summary table:** overall pass %, definition %, example %, unenriched %
- **Decision:** proceed/iterate/escalate based on compliance
- **Top failure patterns:** D1–E6 codes with occurrence counts
- **Sample details:** first 30 words with pass/fail + reason codes
- **Next steps:** command to run full C4 (if ≥85%) or iterate prompt

## Running the Sample

### Prerequisites

```bash
cd content-tool
npm install
export ANTHROPIC_API_KEY=sk-...  # Your Anthropic API key
```

### Dry-Run (No API cost)

```bash
npm run qa:sample -- --dry-run
```

Shows: sampling plan, batch count, estimated cost. **0 API calls.**

### Full Sample Run

```bash
npm run qa:sample
```

Runs the full pipeline:
1. Loads foundation.csv
2. Samples 300 words (10%)
3. Enriches via Claude (batches of 30)
4. Validates each word
5. Writes data/output/qa-sample.csv (enriched)
6. Writes QA_SAMPLE_RESULTS.md (report)

**Cost:** ~$2–5 (300 words ÷ 30/batch × ~6–8 batches × $0.003/batch).

### Custom Sample Size

```bash
# Sample 450 words (15%)
npm run qa:sample -- --size 450

# Sample 100 words with a fixed seed (reproducible)
npm run qa:sample -- --size 100 --seed 42
```

## Interpreting Results

The QA_SAMPLE_RESULTS.md report includes:

| Compliance % | Action |
|---|---|
| **≥85%** | ✅ Proceed to full C4 enrichment (npm run enrich --input ...) |
| **70–84%** | ⚠️ Review top failures, adjust C4 prompt in enrich.ts (lines 89–101), re-run sample |
| **<70%** | ❌ Fundamental issue; escalate and rethink C4 strategy |

## Files Created/Modified

### New files
- QA_CHECKLIST.md — Validation criteria
- src/qa/sample.ts — Main harness
- src/qa/sample.test.ts — Unit tests (validation logic)
- src/qa/cli.ts — CLI wrapper
- data/input/qa-test-sample.csv — Small test file for manual testing

### Modified files
- package.json — Added qa:sample script

### Generated files (after running sample)
- data/output/qa-sample.csv — Enriched sample
- QA_SAMPLE_RESULTS.md — Report with pass/fail counts and details

**Last updated:** 2026-05-31
