# C5 QA — Quick Start

## In 30 seconds

```bash
cd content-tool

# Test without API calls
npm run qa:sample -- --dry-run

# Run real sample (requires ANTHROPIC_API_KEY)
export ANTHROPIC_API_KEY=sk-...
npm run qa:sample

# Check results
cat QA_SAMPLE_RESULTS.md
```

## What happens

1. Picks 300 random words (10% of 3,000)
2. Sends to Claude API in batches of 30
3. Validates definitions (D1–D5) and examples (E1–E6)
4. Reports: pass %, failures by type, sample details

## Success criteria

- **≥85%** → Approve full C4 run (npm run enrich --input ... --output ...)
- **70–84%** → Review failures, tweak prompt, re-run sample
- **<70%** → Escalate (fundamental C4 issue)

## Cost & time

- Sample: $2–5, ~3 min
- Full C4 (3k words): $30–50, ~1 hr (only if sample passes)

---

For details: see **C5_QA_FRAMEWORK.md** or **QA_CHECKLIST.md**
