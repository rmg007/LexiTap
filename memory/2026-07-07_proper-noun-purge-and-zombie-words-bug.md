# Session: Foundation-corpus proper-noun purge + discovered "zombie words" release bug (2026-07-07)

Spawned task (`task_31c2a3fd`, out of the 2026-07-06 TOEFL session) to triage ~36
pre-existing `foundation`-tier words the safety sweep flagged as possible proper
nouns/junk, never adversarially verified (rate-limit interrupted the verify pass).

## Per-word decisions

Checked each candidate's actual `definition` in `words_master.jsonl` (`trump` was
never in the file — no action needed).

**Removed (27, zero ESL vocabulary value — proper nouns / non-English honorific /
junk abbreviations):** washington, london, john, york, henry, david, paul, san
(Japanese honorific, not English), smith, peter, joseph, christ, johnson, jesus,
columbia, louis, florida, cambridge, wilson, massachusetts, ann, angeles, edward,
williams, francisco, ca, dc.

**Kept, tagged `reviewed: true` (5 — legitimate ESL vocabulary, false positives
from the sweep):** africa, america, ireland, japan (country/continent names —
same class as the already-confirmed-legitimate australia/germany/asia/british,
which were never candidates for removal in the first place), and **miller**
(occupational noun — "person who works at a mill" — fully quizzed correctly on
that sense; only flagged because the definition also mentioned "surname."
Tidied the definition + `senses[0].short_gloss` to drop the surname framing
since nothing in the 5 questions actually tests it).

## Real bug found + fixed: `import-master` never prunes — 161 already-purged words were live in the shipped DB

While reconciling `working.db` against the corrected `words_master.jsonl`,
found **161 zombie words** in `data/working/working.db` that exactly matched
the 161 function words purged on 2026-07-05 (`the`, `and`, `all`, `about`,
`after`, etc. — commit `2b2c660`). That commit soft-deleted them in the
**shipped output `words.db`** directly but never touched `working.db`. The
2026-07-06 TOEFL `release` run rebuilt `words.db` fresh from `working.db`
(`createFreshOutputDb`) — which still had all 161 active — silently
re-shipping words Ryan had explicitly decided to cut, one day after cutting
them. Confirmed via `git show 2b2c660` diff (exact word-for-word match against
the zombie set) before deleting.

**Root cause:** `import-master` is upsert-only — it never deletes a `words`
row for a word absent from the master file, and `bootstrapWorkingForRelease`
only bootstraps from CSVs when `working.db` is completely empty (a no-op once
any content exists). So removing a word from `words_master.jsonl` alone does
**nothing** to `working.db` — the shipped DB keeps it forever until someone
manually deletes the working-DB row too. This is exactly what happened to my
27 words in this session before I manually deleted them from `working.db` (all
5 child tables: `word_senses`, `sense_examples`, `word_questions`,
`word_tiers`, `words`) — the same fix applied to the 161 zombies.

**⚠️ Not fixed at the root:** `import-master` still has no reconcile/prune
step. Any future word removal from `words_master.jsonl` needs the same manual
`working.db` surgery or it will zombie back on the next `release`. Flagged as
a separate follow-up (spawn task) rather than fixed here — adding a prune step
is a real design change to `import-master`, out of scope for a content-triage
task.

## Numbers

`words_master.jsonl` 4399 → 4372 lines. `working.db` / shipped `words.db` 4560
→ 4372 words (27 proper-noun purge + 161 zombie function-word re-purge).
`release` bumped `user_version` 3 → 4, copied to `mobile/assets/vocab/words.db`.
`validate --strict`: 0 errors, 2614 warnings (all pre-existing `theme:'General'`
debt, documented, non-blocking). content-tool 21 suites / 303 tests green;
mobile 68 suites / 617 tests green.

**Not committed** — working tree has `content-tool/data/input/words_master.jsonl`
+ `mobile/assets/vocab/words.db` modified, awaiting Ryan's go-ahead per the
commit-only-when-asked rule.
