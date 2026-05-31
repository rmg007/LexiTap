---
title: Implementation Sequence (post-monetization-rethink)
status: active
updated: 2026-05-31
supersedes-ordering-in: none
complements: plans/RELEASE_PLAN.md
---

# LexiTap — Implementation Sequence

The dependency-ordered execution path from **current state → content-complete, monetization-ready app**. This is the near-term spine; [RELEASE_PLAN.md](./RELEASE_PLAN.md) remains the full master plan (store accounts, auth, legal, submission). Authoritative monetization model: [../lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md](../lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md).

**Rule:** work top-down. "What's next" = the topmost unfinished stage. One stage ≈ one or more `/clear`-separated sessions.

## Current state (verified 2026-05-31)

- App skeleton ~85% (clean/hexagonal, ~120 TS files). **Content ~7%** (~216 words) — the real launch blocker.
- ~~`tiers.ts` + bundled `words.db` still encode the dead subscription model.~~ **DONE (Stage 1, 2026-05-31):** schema is many-to-many (`word_tiers`); `tiers.ts` + `words.db` express the one-time exam-pack model.
- `words.db` device-delivery solved in code, **unverified on a physical device**.
- `content-tool` enrichment providers are **stubs** (no real definitions/sentences/audio).

## The spine

```
Stage 1 SCHEMA+CONFIG ✅ → Stage 2 ENRICHMENT → Stage 3 CONTENT VOLUME → Stage 4 DEVICE VERIFY → Stage 5 MONETIZATION WIRING
```

---

## Stage 1 — Model-correct foundation  ✅ DONE (2026-05-31)

**Goal:** code + bundled DB stop encoding the dead model; schema expresses many-to-many categories. Pure code, no hardware, test-verifiable.

- **1.1 Schema → many-to-many.** ✅ `words.tier_id` single-FK → `word_tiers(word_id, tier_id)` junction; word IDs are category-independent (`word_${sha1(normalize(word)).slice(0,16)}`) so one word = one row = one progress row across categories.
  - `content-tool`: `schema/ddl.ts`, `schema/types.ts` (+ `WordTierRow`), `lib/ids.ts`, `lib/fingerprint.ts`, `commands/import.ts`, `commands/export.ts`, `commands/validate.ts`, `commands/enrich.ts` (+ tests).
  - `mobile`: `infrastructure/db/queries/wordQueries.ts` **and** `queries/progressQueries.ts` (both JOIN `word_tiers`); `rows.ts`/`mappers.ts` keep `tier_id` as the projected loaded-under category (no domain ripple — `distractors.ts` unchanged); `SQLiteWordRepository.ts` needed no change.
- **1.2 `tiers.ts` rebuild.** ✅ Exam packs `com.lexitap.exam.{toefl,ielts,gre,gmat,business}` ($9.99, `exam_{name}`) + bundle `com.lexitap.bundle.full` ($29.99, `all_exams`) + upgrade SKUs `bundle.upgrade1/2`; free categories carry **no product**. `TierMeta.premiumPassSku` → `entitlementId`; unused `getPremiumPassTierId` dropped.
- **1.3 `content-tool/lexitap.config.json`.** ✅ 9 tiers (4 free freq/CEFR + 5 exam packs); `audio: true` universal.
- **1.4 Rebuild `words.db`.** ✅ `content_tiers` (9) + `word_tiers` (216 memberships) match config; copied to `mobile/assets/vocab/words.db`.

**Done:** ✅ `npm run check` green in both projects (content-tool 43 tests, mobile 132); `words.db` reflects the new model; `import.test.ts` proves one word in ≥2 categories → one content/progress row (real SQLite engine).
**Blocks:** everything below. **Blocked by:** nothing.

> Note: current seed CSVs (foundation/advanced/toefl) are disjoint, so no word is yet tagged into ≥2 categories in the built DB — the **capability** is proven by test + schema; actual multi-tagging lands with content volume (Stage 3).

---

## Stage 2 — Real enrichment pipeline

**Goal:** replace stub providers with real content generation.

- **2.1 LLM provider** — definitions + example sentences (exactly one blank, theme-tagged) per the SEED_DATA_SPEC quality bar.
- **2.2 Neural TTS provider** (Amazon Polly **or** Google) — word + sentence audio; cache + bundle. **Confirm redistribution license first** (launch gate — see THIRD_PARTY_DEPENDENCY_AUDIT).
- **2.3** Wire providers into the `enrich` command; `validate` passes on generated rows.

**Done:** `enrich` produces real definitions/sentences/audio for a sample; sampled human review; `validate` clean.
**Blocked by:** Stage 1; TTS provider + license decision.

---

## Stage 3 — Content volume  ← the true launch blocker

**Goal:** fill `words.db` to launch-ready volume.

- **3.1 Confirm source lists + licenses** — Most Common 3000/9000 frequency list, CEFR mapping, exam lists. **Licensing is a launch gate.**
- **3.2 Import + enrich at volume**; tag words into many-to-many categories.
- **3.3 Export**; measure bundle size (audio mp3s) → decide bundle-vs-on-demand download if too large.

**Done:** `words.db` at target volume (**set N**); free categories populated; ≥1 exam pack populated.
**Blocked by:** Stages 1–2; source-list licensing.

---

## Stage 4 — Delivery on real devices

- **4.1** Leave Expo Go → EAS dev client (RELEASE_PLAN **A0** gate).
- **4.2** Device-verify the asset→copy→ATTACH path on physical iOS + low-end Android.

**Done:** content loads on both platforms from a real build.
**Blocked by:** Stage 3 (real content to load) + hardware.

---

## Stage 5 — Monetization wiring  ( = RELEASE_PLAN Phase 3 )

RevenueCat one-time non-consumable products + entitlements + paywall (per [Paywall.md](../lexitap-docs/03-ux-design/screens/Paywall.md)) + restore purchases + entitlement-check use case. Detail in RELEASE_PLAN **A1, R1–R6**.

**Done:** a sandbox purchase of an exam pack unlocks its content; bundle + upgrade SKUs resolve correctly.
**Blocked by:** Stage 1 (products in `tiers.ts`), Stage 4 (EAS), auth (RELEASE_PLAN AU1–AU3).

---

## Open decisions gating the path

| Decision | Gates | Owner |
|---|---|---|
| TTS provider (Polly vs Google) + redistribution license | Stage 2 | you |
| Source-list licensing (frequency + exam lists) | Stage 3 | you |
| Launch content-volume target **N** ("enough" for v1) | Stage 3 | you |
| B2B | — **does NOT gate this path** (deferred) | you (later) |

**Next action: Stage 2.1** — replace the stub LLM provider with real definition + example-sentence generation (SEED_DATA_SPEC quality bar). Stage 1 (model-correct foundation) is complete.
