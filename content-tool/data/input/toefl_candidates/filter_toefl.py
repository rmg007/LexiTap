#!/usr/bin/env python3
"""Phase 0: clean the TOEFL 3000 list before any paid enrichment.
Free, offline. Produces a vetted candidate set + a flagged-for-review set."""
import json, csv, re
from collections import OrderedDict
from wordfreq import zipf_frequency
import simplemma

SRC = "/Users/ryan/Downloads/TOEFL Vocabs/output/toefl_3000_words.txt"
MASTER = "/Users/ryan/Desktop/LexiTap/content-tool/data/input/words_master.jsonl"
OUT = "/private/tmp/claude-501/-Users-ryan-Desktop-LexiTap/f5e21a30-61f3-424c-b6cf-06dcf1329529/scratchpad"

# small function-word stoplist (articles/pronouns/preps/conj/aux/modals) — memory: 161 already purged
STOP = set("a an the of to in on at by for with from into onto upon over under is are was were be been being am do does did have has had will would shall should can could may might must and or but nor so yet if then than that this these those i you he she it we they me him her us them my your his its our their who whom whose which what not no yes as".split())

# load existing master words (lemma-key too)
master = set()
with open(MASTER) as f:
    for line in f:
        line = line.strip()
        if line:
            master.add(json.loads(line)["word"].lower().strip())

# load list preserving source order (= difficulty rank)
seen = OrderedDict()
with open(SRC) as f:
    for i, raw in enumerate(f, 1):
        w = raw.strip().lower()
        if not w:
            continue
        if w not in seen:  # dedup, keep first (best rank)
            seen[w] = i

rows = []
for w, rank in seen.items():
    lemma = simplemma.lemmatize(w, "en")
    z = zipf_frequency(w, "en")
    reasons = []
    if w in master:
        reasons.append("already_in_master")
    if lemma != w:
        reasons.append(f"inflection->{lemma}")
        if lemma in master:
            reasons.append("lemma_in_master")
    if not re.fullmatch(r"[a-z][a-z'-]*", w):
        reasons.append("nonword_chars")
    if w in STOP:
        reasons.append("function_word")
    if " " in w or "_" in w:
        reasons.append("multiword")
    # obscurity bands
    if z == 0:
        band = "unknown"
        reasons.append("zipf0_notfound")
    elif z < 2.5:
        band = "obscure"
        reasons.append(f"obscure_zipf{z:.1f}")
    elif z < 3.5:
        band = "rare"
    else:
        band = "common"
    rows.append({"word": w, "source_rank": rank, "lemma": lemma, "zipf": round(z, 2), "band": band, "flags": reasons})

# partition
auto_drop = [r for r in rows if any(x.startswith("already_in_master") or x == "lemma_in_master" or x == "function_word" or x == "multiword" or x == "nonword_chars" for x in r["flags"])]
drop_words = {r["word"] for r in auto_drop}
remaining = [r for r in rows if r["word"] not in drop_words]
flag_review = [r for r in remaining if r["band"] in ("obscure", "unknown")]
clean = [r for r in remaining if r["band"] not in ("obscure", "unknown")]

def dump(name, data):
    with open(f"{OUT}/{name}", "w") as f:
        json.dump(data, f, indent=1)

dump("toefl_auto_drop.json", auto_drop)
dump("toefl_flag_review.json", flag_review)
dump("toefl_clean.json", clean)

# csv for easy human scan of the flag list
with open(f"{OUT}/toefl_flag_review.csv", "w", newline="") as f:
    wcsv = csv.writer(f)
    wcsv.writerow(["word", "source_rank", "zipf", "band", "flags"])
    for r in sorted(flag_review, key=lambda x: x["zipf"]):
        wcsv.writerow([r["word"], r["source_rank"], r["zipf"], r["band"], "|".join(r["flags"])])

print(f"total unique:        {len(seen)}")
print(f"auto-dropped:        {len(auto_drop)}  (in master / inflection-of-master / function / multiword)")
print(f"  ...of which already_in_master: {sum('already_in_master' in r['flags'] for r in auto_drop)}")
print(f"  ...of which inflection:        {sum(any('inflection' in x for x in r['flags']) for r in auto_drop)}")
print(f"remaining candidates: {len(remaining)}")
print(f"  -> CLEAN (auto-keep):     {len(clean)}  (common+rare)")
print(f"  -> FLAG for your review:  {len(flag_review)}  (obscure zipf<2.5 or not-found)")
print()
print("Band breakdown of remaining:")
from collections import Counter
bc = Counter(r["band"] for r in remaining)
for b in ("common", "rare", "obscure", "unknown"):
    print(f"  {b:8} {bc.get(b,0)}")
print()
print("Sample of FLAGGED (most obscure first):")
for r in sorted(flag_review, key=lambda x: x["zipf"])[:20]:
    print(f"  {r['word']:18} zipf={r['zipf']:<5} rank={r['source_rank']}")
