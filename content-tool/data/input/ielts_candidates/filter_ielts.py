#!/usr/bin/env python3
"""Phase 0: dedup + normalize the IELTS 3000 list before any master-file write.
Free, offline. Produces the overlap set (tag-only, Phase 1) + the net-new
clean set (stub-ingest, Phase 2) + a flagged-for-review set (lemma collisions).
Mirrors ../toefl_candidates/filter_toefl.py."""
import json
import re
from collections import Counter, OrderedDict

import openpyxl
import simplemma

SRC = "/Users/ryan/Desktop/IELTS Vocab/IELTS_Vocabulary_3000_1.xlsx"
MASTER = "/Users/ryan/Desktop/LexiTap/content-tool/data/input/words_master.jsonl"
OUT = "/Users/ryan/Desktop/LexiTap/content-tool/data/input/ielts_candidates"

# load existing master: exact word set + lemma set (lemma set built from the
# SAME lemmatizer so lemma_in_master compares like-for-like)
master_words = set()
master_lemmas = set()
with open(MASTER) as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        w = json.loads(line)["word"].lower().strip()
        master_words.add(w)
        master_lemmas.add(simplemma.lemmatize(w, "en"))

# load the xlsx preserving row order (source order = Batch order already)
wb = openpyxl.load_workbook(SRC, data_only=True)
ws = wb["Vocabulary"]
rows = list(ws.iter_rows(values_only=True))[1:]  # skip header

seen = OrderedDict()
for i, r in enumerate(rows, 1):
    word_raw, cefr, batch, tier = r
    w = str(word_raw).strip().lower()
    if not w:
        continue
    if w not in seen:  # dedup, keep first occurrence (file already has 0 dupes)
        seen[w] = {"word": w, "cefr_level": cefr, "batch": int(batch), "tier": tier, "source_rank": i}

entries = list(seen.values())

overlap = []       # exact word already in master -> Phase 1 tag-only
flag_review = []   # lemma collision / nonword / multiword -> human judgment
clean = []         # genuinely net-new -> Phase 2 stub ingest

for e in entries:
    w = e["word"]
    reasons = []
    if w in master_words:
        overlap.append(e)
        continue
    if not re.fullmatch(r"[a-z][a-z'-]*", w):
        reasons.append("nonword_chars")
    if " " in w or "_" in w:
        reasons.append("multiword")
    lemma = simplemma.lemmatize(w, "en")
    if lemma != w:
        reasons.append(f"inflection->{lemma}")
        if lemma in master_words or lemma in master_lemmas:
            reasons.append("lemma_in_master")
    if reasons:
        e2 = dict(e)
        e2["flags"] = reasons
        flag_review.append(e2)
    else:
        clean.append(e)


def dump(name, data):
    with open(f"{OUT}/{name}", "w") as f:
        json.dump(data, f, indent=1)


dump("ielts_overlap.json", overlap)
dump("ielts_flag_review.json", flag_review)
dump("ielts_clean.json", clean)

print(f"total unique in source:     {len(entries)}")
print(f"overlap (already in master): {len(overlap)}  -> ielts_overlap.json (Phase 1 tag-only)")
print(f"flagged for review:          {len(flag_review)}  -> ielts_flag_review.json (human judgment)")
print(f"clean net-new:               {len(clean)}  -> ielts_clean.json (Phase 2 stub ingest)")
print()
clean_cefr = Counter(e["cefr_level"] for e in clean)
clean_tier = Counter(e["tier"] for e in clean)
print("clean by CEFR:", dict(clean_cefr))
print("clean by Tier:", dict(clean_tier))
overlap_cefr = Counter(e["cefr_level"] for e in overlap)
overlap_tier = Counter(e["tier"] for e in overlap)
print("overlap by CEFR:", dict(overlap_cefr))
print("overlap by Tier:", dict(overlap_tier))
if flag_review:
    print()
    print("flagged sample:")
    for e in flag_review[:20]:
        print(" ", e["word"], e["flags"])
