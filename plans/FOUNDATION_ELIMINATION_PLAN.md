# Foundation Elimination — real categories, not a junk-drawer tag

**Status:** Phase 1 done (2026-07-10). Phase 2 blocked on Ryan sourcing a frequency list.
**Goal:** Every word carries real, meaningful category tags (CEFR level,
and/or IELTS/TOEFL/GRE/etc., and/or a real "Most Common 3000" list) instead
of sitting in a catch-all `foundation` bucket with no other information.
**Issue:** none — Ryan-initiated, not in ORCHESTRATION.md/ROADMAP.md yet.

**Decisions (Ryan, 2026-07-10):**
- **Content tagging only — monetization untouched.** The `foundation` tier_id
  stays exactly as-is as the **paid-access gate** ($9.99 "Foundation Pack",
  entitlement `foundation_access`, live in RevenueCat/ASC per RC-1). This plan
  does NOT rename/remove that SKU, its entitlement, or the `word_tiers` row
  that grants access. Only the *descriptive* categorization of the words
  themselves changes.

**Decisions needed from Ryan:**
1. **Source for a real "Most Common 3000" list.** `common3k` is currently a
   5-word stub (`is_free`, not yet populated, `isActive: false` in
   [`tiers.ts`](../mobile/src/config/tiers.ts)). Needs Ryan to source/approve
   a real frequency list (Oxford 3000, NGSL, or similar) — same blocker
   pattern every specialty tier (TOEFL/IELTS/GRE/GMAT/business/advanced) hit.
   **Recommendation:** Oxford 3000 (CEFR-aligned, licensable summary lists
   exist, matches the CEFR-first framing already in the DB) — but this is
   Ryan's call, not assumed here.
2. **Does the `word_tiers` "foundation" row itself get renamed** (e.g. to a
   neutral `core`/`base` tier_id, same SKU/entitlement/price, just a less
   confusing internal name) **or stay literally `foundation`** since the
   paid product actually IS called "Foundation Pack"? **Recommendation:
   leave the tier_id as `foundation`** — it correctly matches the shipping
   product name, and renaming it is a mechanical churn across
   `lexitap.config.json` + `tiers.ts` + 4 mobile fallback references for zero
   user-facing benefit. The complaint is about words having no OTHER tag,
   not about this one being named `foundation`.

---

## Ground truth (verified live against `words.db` v6, 2026-07-10)

| Metric | Count |
|---|---|
| Words tagged `foundation` | 2,620 |
| ...also carrying a real tier (ielts/toefl/gre/gmat/business/advanced/common3k/common9k) | 482 |
| **`foundation`-ONLY words (no other tier)** | **2,096** |
| ...of those, with **no `cefr_level` at all** | **2,038** |

This confirms `foundation` is not secretly CEFR-organized underneath — the
words genuinely carry no other classification. Renaming the tier alone does
nothing; the words need real classification.

**Related, already-known debt (not this plan's scope, noted for context):**
`theme` field is 'General' for 2,562 words corpus-wide (see
[`memory/2026-06-10_jsonl-phase3-4-openai.md`](../memory/2026-06-10_jsonl-phase3-4-openai.md)
and the `AGENTS.md` known-debt note) — heavily overlapping with the same
undercategorized population. Thematic (`theme`) re-classification is a
**separate**, already-tracked debt item; this plan only closes the
CEFR + specialty-tier gap Ryan asked about.

## Existing tooling — most of Phase 1 is already built

[`content-tool/src/commands/categorize.ts`](../content-tool/src/commands/categorize.ts)
is Phase 3 of the 2026-06-10 JSONL pipeline redesign, built for exactly this:
cross-references every word against specialty tiers AND fills CEFR level,
**additively** (`mergeCategorization` — never removes existing tier
membership, including `foundation`). It was built, unit-tested, and then the
**bulk run was HELD** (memory: `2026-06-10_jsonl-phase3-4-openai.md` —
"per-word sync calls don't scale... partial categorize (~500 words)
validated then reverted, nothing shipped"). This plan is that held run,
finally executed, scoped to the 2,038-word gap instead of the whole corpus.

Command shape (already exists, no new code needed for the mechanics):
```
categorize --limit <n> [--model gpt-4o-mini] [--dry-run] [--no-resume]
```
Resume-safe via `<master>.categorize-done.jsonl` sidecar. `--limit` is
required (guards accidental whole-file spend). Cost estimate prints before
any call.

## Out of scope
- Renaming/removing the `foundation` paid SKU, entitlement, or `word_tiers`
  access-gate row (Ryan's call above).
- `theme: 'General'` thematic re-classification (separate known debt).
- Sourcing GRE/GMAT/business/advanced real word lists (each still a 5-word
  stub) — same Ryan-sourcing blocker as `common3k`, not bundled into this
  plan; can run as a follow-up once Ryan provides lists, same playbook.
- Any app UI changes — grep confirms "Foundation" only appears in
  [`PaywallScreen.tsx`](../mobile/src/presentation/screens/PaywallScreen.tsx)
  as the **product name** ("Foundation Pack $9.99"), never as a
  word-category label anywhere in the app. There is nothing to fix in the UI.

## Phases

### Phase 1 — CEFR backfill on the 2,038 foundation-only, no-CEFR words
1. Confirm `categorize`'s existing merge behavior against a **fresh 30-word
   sample** drawn from the 2,038 (`--limit 30 --dry-run` first, then a real
   small paid run) — verify CEFR assignments look sane before any bulk
   spend, mirroring the TOEFL/IELTS 20-sample-gate precedent. Ryan reviews
   the sample.
2. Run `categorize --limit 2038 --model gpt-4o-mini` (chunked via the
   existing `FLUSH_CHUNK=200` resume granularity — no code change, just
   invocation) against `words_master.jsonl`, scoped to exactly this word set
   (filter the input list to the 2,038 ids before invoking, or add a
   `--ids-file` style filter if `categorize` doesn't already support
   targeting an arbitrary subset — check `categorize.ts`'s existing flags
   first; extend minimally only if genuinely missing).
3. Adversarial spot-check pass (same shape as IELTS Phase 5): sample ~100 of
   the newly-CEFR-tagged words, verify assigned levels look defensible
   against `frequency_rank`/`difficulty` (a B1-difficulty word tagged C2
   would be a red flag).
4. `import-master` → `validate --strict` → `release`.

**Done means:** `npm run check` GREEN in content-tool + mobile; 0 of the
2,038 words remain both foundation-only AND CEFR-null; `words.db` rebuilt
and shipped with the new user_version.

### Phase 2 — Real "Most Common 3000" tier (gated on Decision #1)
1. Once Ryan sources/approves a real frequency list: same ingest shape as
   TOEFL/IELTS Phase 0–2 (dedup against `words_master.jsonl`, tag overlaps
   `common3k`, ingest net-new as stubs if any exist outside current
   coverage — expect heavy overlap with existing foundation/CEFR-A1-B2
   words, so this may be almost entirely a tag-only pass with few or zero
   net-new words).
2. Register `common3k` as `isActive: true` in
   [`mobile/src/config/tiers.ts`](../mobile/src/config/tiers.ts) once real
   content backs it (currently `isActive: false`, correctly hidden).

**Done means:** `common3k` word count reflects a real sourced list (not 5
stub words); `npm run check` GREEN; `words.db` rebuilt.

**Blocked until Ryan answers Decision #1.** Do not start without a real
source list — guessing at "the 3000 most common English words" without a
citable source is exactly the kind of invented-scope this project's
planning rules forbid.

## Risks / gotchas
- **Concurrent-session hazard on `words_master.jsonl`** — same standing
  gotcha as every prior content session: never hand-edit the master file
  while `categorize`/`enrich-master` holds it in memory; one owner per run.
- **`import-master` prune-by-default** (fixed 2026-07-09) will soft-delete
  any word absent from the imported set — irrelevant here since this plan
  only *adds* categories, never removes words, but worth re-confirming
  before the Phase 1 release step given how recently that bug was fixed.
- **`validate.ts`'s `loadWords()` deleted_at filter** (fixed 2026-07-10, this
  session) — already fixed, no action needed, noted so nobody "re-discovers"
  it.
- **Pre-existing config drift, found this session, NOT this plan's scope to
  fix:** `content-tool/lexitap.config.json` marks `foundation` as
  `is_free: true, sku: null`, while `mobile/src/config/tiers.ts` marks it as
  a **paid** product ($9.99, `foundation_access`). These two configs
  already contradict each other independent of anything in this plan.
  Flagging so it doesn't get mistaken for something this plan caused —
  worth its own small follow-up ticket to reconcile (content-tool's tier
  registry doc likely just went stale after the monetization rethink).
- No `infrastructure/db`, `domain/srs`, or `infrastructure/iap` files are
  touched by this plan — pure `words_master.jsonl` content + `content-tool`
  invocation. No CLAUDE.md High-Risk Path confirmation gate applies.

## Docs to update on completion
- **`memory/MEMORY.md`** — new session note, same format as the IELTS/TOEFL
  entries: word counts before/after, sample-gate outcome, any bugs hit.
- **AGENTS.md** — the existing "~2% of foundation is labelled" comment in
  [`wordQueries.ts`](../mobile/src/infrastructure/db/queries/wordQueries.ts)
  (and its `AGENTS.md` mirror, if any) becomes stale once Phase 1 ships —
  update the CEFR-coverage number and revisit whether learn-batch ordering
  should incorporate `cefr_level` now that it's actually populated (was a
  documented no-op until backfilled, per
  [`memory/2026-07-05_learn-batch-ordering.md`](../memory/2026-07-05_learn-batch-ordering.md)).
- **This plan file** — status flips to `done` on completion, same convention
  as `IELTS_INGEST_PLAN.md`.
