## Session: content-tool sense validation + RTL harness fixes (2026-06-10)

**What happened:** 8 confirmed/plausible findings from a code review of the Phase 1 ingest + RTL harness commits. All 8 fixed. Findings came from the `/review-and-fix` skill run earlier this session.

**Bugs / gotchas:**

- **`loadSenses` / `loadSenseExamples` had no tier filter.** `runValidate` scopes `wordIds` to the requested tier but passed all senses — S1 fired false-positives for every sense belonging to a different tier when running `validate --tier <slug>`. Fix: both functions now accept `tier?` and JOIN through `word_tiers` when set. Callers in `runValidate` forward `options.tier`.
- **`buildOutputDb` skipped `validateSenseRows`.** Malformed senses (bad glosses, orphan sense_indexes, cloze in teaching examples) would silently ship in the output `words.db`. Fix: call `validateSenseRows` after `validateRows` and throw on sense errors.
- **S6 and S2 both fired for the same "must start at 0" violation.** S6 checked `sorted[0].sense_index !== 0`, then S2's loop at `i === 0` caught the same condition and emitted a confusingly different message. Fix: removed S6; S2 at `i === 0` now emits "senses must start at sense_index 0, found N".
- **`ingest-senses` had no word_id existence check.** `PRAGMA foreign_keys = OFF` in `openWorkingDb` means FK constraints don't fire. An invalid `word_id` in the source JSONL silently inserted orphan senses. Fix: explicit `SELECT 1 FROM words WHERE id = ? AND deleted_at IS NULL` guard inside the transaction — throws with a descriptive message.
- **`INSERT_SENSE` / `INSERT_EXAMPLE` had dead `ON CONFLICT DO UPDATE` clauses.** The transaction always does a clean-slate delete before inserting, so no conflict can ever occur. The clauses were dead code masking the clean-slate invariant. Fix: removed both ON CONFLICT blocks.
- **`isGlossStyle` regex too narrow.** Only caught `word that|word meaning|term for|term meaning`. Common gloss patterns ("a person who", "the act of", "the state of being", "the quality of", "the type of") were missed — S8 warning never fired on them. Expanded to cover the common openers.
- **Multi-sense RTL test on cards 2+3 only asserted `MEANING 1`.** Both cards had `MEANING 2 · verb` in the mock but no assertion for it — a regression where card 2/3 fell back to flat silently would have passed. Fix: added `await findByText('MEANING 2 · verb')` for each card.
- **Multi-sense RTL test dropped the flat-definition toBeNull assertion.** Should confirm rich layout fully replaces the flat definition on card 1. Fix: added `expect(queryByText(BATCH[0].definition)).toBeNull()`.

**Patterns / lessons:**

- When a loader function has a scope option (`tier?`), every caller must be checked and updated in the same PR. Easy to add the parameter but forget to thread it through callers.
- `PRAGMA foreign_keys = OFF` (required for expo-sqlite compatibility) means FK guards are purely documentary in the content-tool. Every ingest operation that inserts a foreign key must have an explicit existence check.
- Clean-slate-delete + plain INSERT is simpler and more correct than INSERT ... ON CONFLICT. The ON CONFLICT pattern is for upsert scenarios where you genuinely don't know if a row exists; clean-slate ingest is not that scenario.
- Test for both the positive case (rich layout renders) AND the negative (flat definition is absent). A test that only checks presence can't catch the case where both are rendered.
