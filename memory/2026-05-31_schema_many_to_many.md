# Stage 1 — Many-to-Many Schema + Model-Correct tiers.ts (2026-05-31)

Implemented IMPLEMENTATION_SEQUENCE Stage 1. Both projects `npm run check` green
(content-tool 43 tests, mobile 132). `words.db` rebuilt + copied to mobile bundle.
DB schema doc bumped to **v3.1**.

## What changed (the model)

- **word↔category is many-to-many.** `words.tier_id` single-FK is GONE. Membership
  lives in new junction `word_tiers(word_id, tier_id)` (PK both, FKs to words +
  content_tiers). `words` is now a pure content row.
- **Word IDs are category-independent:** `word_${sha1(normalizeWord(word)).slice(0,16)}`
  (16 hex = 64-bit, collision-free at scale). No tier in the id → one word = one
  `words` row = one `user_progress` row across every category. ⚠️ Changing a `word`
  string re-keys the row and orphans review history — edit meaning via
  definition/usage_notes only.
- **tiers.ts** = one-time exam-pack model (NO subscriptions): 5 packs
  `com.lexitap.exam.{toefl,ielts,gre,gmat,business}` @ $9.99 (grant `exam_{name}`)
  + `bundle.full` $29.99 + `bundle.upgrade1/2` $19.99/$9.99 (all grant `all_exams`).
  Free categories (foundation/advanced/common3k/common9k) carry no product.
- **content-tool config** = 9 tiers, `audio: true` universal (audio is free per
  [[2026-05-31_monetization_rethink]]).

## Non-obvious decisions (why it looks like this)

- **Mobile kept `WordRow.tier_id` / `Word.tierId`.** Queries JOIN `word_tiers` and
  project `wt.tier_id AS tier_id` — so `tier_id` now means "the category the word
  was loaded under," NOT an intrinsic single owner. Deliberate minimal-ripple
  choice: `domain/quiz/distractors.ts` filters the distractor pool by
  `w.tierId === target.tierId` (same-category pool) and keeps working untouched.
  **`Word.tierId` is NOT the authoritative membership** — to get a word's full
  category set, query `word_tiers` directly.
- `selectWordById` has no tier context (word may be in many) → projects a
  representative `tier_id` via scalar subquery (`ORDER BY tier_id LIMIT 1`). Fine
  for history/replay, which doesn't gate on tier.
- **`progressQueries.ts` also had to change** (countDueInTier + selectProgressPage
  joined `contentdb.words` by tier_id) — it wasn't in the task's file list but
  breaks the build otherwise. Both now JOIN `word_tiers`.
- **import counts at membership grain.** `INSERT OR IGNORE INTO word_tiers`;
  `onConflict='error'` fires ONLY on a duplicate `(word, tier)` membership — the
  same word arriving via a DIFFERENT tier is legitimate and refreshes the shared
  content row. All 4 original import tests still pass.
- **validate(words, memberships, …)** — dropped the dup-surface-within-tier rule
  (a category-independent id makes it a structural PK collapse, impossible); added
  "word has no membership" + "membership → unknown tier/word"; theme-required
  fires if ANY of a word's categories requires a theme.
- **TierMeta port:** `premiumPassSku` (subscription-era) → `entitlementId`; unused
  `getPremiumPassTierId`/`PREMIUM_PASS_TIER_ID` removed. No use case consumed them.
- **Proof test** ("one word in ≥2 categories → one progress row") lives in
  `content-tool/src/commands/import.test.ts` — uses better-sqlite3 (real engine).
  Mobile db tests are native-mocked (expo-sqlite), can't run real SQL.

## Gotchas for next time

- **Rebuilding words.db:** `rm content-tool/data/working/working.db` FIRST. `openWorkingDb`'s
  `applyContentSchema` skips DDL when a `words` table already exists, so a stale
  working.db keeps the OLD schema (no `word_tiers`) and the build fails/wrong.
  Then `npm run build:db`.
- **`mobile/assets/vocab/words.db` is the committed bundle** — manually
  `cp content-tool/data/output/words.db mobile/assets/vocab/words.db` after a
  rebuild (output dir is gitignored; there is NO sync script).
- High-risk `infrastructure/db/**` + `iap/**` deny-list entries were temporarily
  lifted for this work and **restored** before commit. Confirm with founder before
  editing those paths.
- Current seed CSVs are disjoint → no word is actually in ≥2 categories in the
  built DB yet. Multi-tagging lands with content volume (Stage 3); capability is
  proven by test + schema.

Next: Stage 2 (real enrichment providers). Related: [[2026-05-31_monetization_rethink]],
[[2026-05-31_repo_state_reconciliation]].
