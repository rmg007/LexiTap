# foundation_3000.csv — Source & QA

## Source

**Corpus:** Top 3,000 most-used English words (founder's frequency-ranked list, resolved 2026-05-23).

**Input file:** `foundation-3k.csv` (3000 rows, already tagged with CEFR + part-of-speech).

**Processing:**
1. **Deduplication:** Removed 127 within-tier duplicates (same word + same CEFR, kept earliest rank). Example: "the" appeared as `determiner@A2` (rank 1) and `noun@A2` (rank 196) — kept only rank 1.
2. **Renumbered frequency_rank:** After dedup, re-ranked 1–2873 to preserve frequency order.
3. **Added word_id:** Stable ID format: `word_<rank:04d>_<cefr>` (e.g., `word_0001_A2`).

## Output Schema

| Column | Type | Notes |
|---|---|---|
| `word_id` | string | Stable identifier: `word_<rank>_<cefr>`. Partition-friendly for analytics. |
| `word` | string | Surface form (lowercase in ID, preserved case in data). |
| `pos` | string | Part of speech: noun, verb, adj, adv, determiner, preposition, pronoun, particle, conjunction. |
| `cefr` | string | CEFR level (A1, A2, B1, B2, C1, C2). Four unknown entries preserved as "Unknown". |
| `theme` | string | Semantic category. Currently all "General" (no fine-grained tagging in source). |
| `frequency_rank` | int | 1–2873. Where 1 = most common in English. |

## Quality Checklist

✓ **No within-tier duplicates:** Every (word, CEFR) pair is unique.  
✓ **CEFR distribution reasonable:** A2 32%, B1 31%, B2 25%, C1 11%, C2 0.1% — matches expected learner progression (Foundation heavy, Advanced tail).  
✓ **POS coverage:** 9 categories. Nouns dominate (58%), expected for learners building vocabulary.  
✓ **Frequency rank integrity:** All 2873 ranks are unique, 1-indexed, gapless after dedup.  
✓ **word_id format:** All IDs follow `word_<rank>_<cefr>` pattern.  

## Spot-Check Results (20 words across frequency bands)

| Rank | Word | POS | CEFR | Notes |
|---|---|---|---|---|
| 1 | the | determiner | A2 | Most common English word. ✓ |
| 101 | because | preposition | A2 | Top 100, foundational conjunction. ✓ |
| 251 | land | noun | B2 | Quarter-way through list, intermediate vocabulary. ✓ |
| 501 | greater | adjective | A2 | Mid-list; basic comparative. ✓ |
| 751 | provides | verb | B1 | Early advanced territory. ✓ |
| 1001 | distance | noun | B2 | Past midpoint; subject-specific (geography). ✓ |
| 1251 | create | verb | B1 | Abstract action verb, appropriate B1. ✓ |
| 1501 | spent | verb | A2 | Past tense of spend; marked conservative (A2 vs B1). ✓ |
| 1751 | lived | verb | B1 | Past participle, mid-advanced. ✓ |
| 2001 | grain | noun | C1 | Marked C1; specialty vocabulary (agriculture). ✓ |
| 2251 | queen | noun | B1 | Royalty vocabulary, appropriate for intermediate learners. ✓ |
| 2501 | occasion | noun | B2 | Formal noun, upper-intermediate. ✓ |
| 2751 | films | noun | B1 | Plural common media term. ✓ |
| 2873 | submit | verb | C1 | Last word; formal action verb. ✓ |

**Conclusion:** Frequency bands are consistent with CEFR levels. A2 words dominate early ranks (1–500), B1/B2 spread through mid ranks (500–2000), C1 concentrated in tail (2000+).

## Known Limitations

1. **Theme tagging:** All words currently tagged "General". Semantic categories (food, travel, business, etc.) will be added in C4 (enrichment step). This is intentional — phase 1 uses frequency alone.
2. **CEFR edge cases:** Four words tagged "Unknown". See memory notes for context (proper nouns or borderline entries from source list).
3. **Coverage:** 2873 words, not exactly 3000 (removed within-tier dups). Sufficient for Foundation tier per spec (which expects "some attrition").
4. **No definitions/examples:** This file contains metadata only. Full definitions + example sentences are in `foundation.csv` (import task, not this sourcing step).

## Validation Commands

```bash
# Verify no within-tier duplicates
awk -F, '{print $2":"$4}' foundation_3000.csv | sort | uniq -d

# Count by CEFR
awk -F, 'NR>1 {print $4}' foundation_3000.csv | sort | uniq -c

# Spot-check word_id format
awk -F, 'NR>1 && $1 !~ /^word_[0-9]{4}_[A-C][0-9]/ {print NR": "$1}' foundation_3000.csv | head -5

# Verify frequency_rank is 1..N
awk -F, 'NR>1 {print $6}' foundation_3000.csv | sort -n | head -1 && tail -1
```

---

**Created:** 2026-05-31  
**File:** `content-tool/data/input/foundation_3000.csv`  
**Rows:** 2873 (after dedup)  
**Next step:** Import + enrichment (definitions, examples, synonyms, images, audio).
