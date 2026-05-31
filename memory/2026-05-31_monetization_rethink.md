# Monetization Rethink — 2026-05-31

Full rebuild of the pricing model. The prior "Premium Pass subscription + $1.99
Common 3000 standalone + B2B seat packs" model is **dead**. Authoritative doc:
[lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md](../lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md).

## New model (locked)

- **Free** (no product, ever): Foundation (A2-B1), Advanced (B2-C1), Most Common
  3000, Most Common 9000 — **+ word & sentence audio**, SRS, streaks, themes.
- **Paid** = one-time **exam packs** (TOEFL/IELTS/GRE/GMAT/Business) **@ $9.99
  uniform** + **All-Exams bundle @ $29.99** (includes current + future packs).
- **No subscriptions.** No monthly/annual/Premium Pass. No standalone Common3k SKU.
- **B2B deferred** entirely (build nothing; leave entitlement door open).

## The reasoning (why subscriptions died)

- Exam prep = deadline-driven → buy/cram/pass/leave. A churned annual sub collects
  ~$12.48 (2.5-mo churn, per old doc's own math); a $9.99-$29.99 one-time collects
  MORE, with zero churn/refund ops. "Recurring" was a fiction for a finite need.
- **Overlapping category tags break content-as-paywall.** A word (e.g. "feature")
  is in Foundation + Common3000 + an exam list at once. If TOEFL is ~80% words
  already free, paywalling the list sells nothing. → Paid must = rare academic
  words **disjoint from free bands** + exam curation + exam-format drilling.
- Only genuinely-recurring revenue was B2B; deferring it makes the business 100%
  one-time B2C. Fine for solo founder; projections roughly halve, lose ARR.
- Audio is pedagogically essential for ESL (must hear words) → free, table stakes,
  NOT a paid lever.

## Two mechanics that bit us / got solved

- **No native non-consumable upgrade** on App Store/Google. To move a pack-owner to
  the bundle without double-charging: gated **upgrade SKUs** priced at `$29.99 −
  paid` → `bundle.full $29.99` / `bundle.upgrade1 $19.99` (own 1) / `bundle.upgrade2
  $9.99` (own 2). Own 3+ → buy remaining packs individually; no upgrade3. Uniform
  $9.99 pricing is what keeps the subtraction clean.
- **Adding a 2nd pack is trivial** — independent one-time, entitlements stack
  (`exam_toefl` + `exam_ielts`). That's the payoff of one-time packs.
- Access check: `hasAccess(pack) = isFree OR owns(pack) OR owns(all_exams)`.
  Entitlements memory-only via RevenueCat, never in user.db.

## Cost / budget consequence

- All-audio-free only fits $194 on **cheap neural TTS (Amazon Polly / Google), NOT
  ElevenLabs**. ElevenLabs ~$100-160 for ~9k free words; Polly/Google ~$5-10.
  Roadmap's "ElevenLabs ~$50" assumption is replaced.

## Schema direction (NOT yet implemented — code was reverted this session)

- `words.tier_id` single-FK → **many-to-many** word↔category (junction table). A
  word carries multiple category tags; a *purchase* unlocks a pack's curated set.
  Categories (free tags) decoupled from products (paid entitlements). This is the
  next implementation task; the pricing model above is the spec it must satisfy.

## Doc reconciliation status

**Done (2026-05-31):** authoritative `REVENUE_MODEL_PRICING.md` (rewrite), both
ROADMAPs, `Paywall.md` (rewrite), `MONETIZATION_COMPLIANCE.md` (rewrite),
`APP_STORE_DISTRIBUTION_STRATEGY.md` (rewrite), `RELEASE_PLAN.md` (banner + A1/D2/
D8/C9/C11/R6 + IAP-stub row), `next_prompt`, plus a mechanical sweep of ~16
product/ux/technical/ops docs (PRD, USER_STORIES, FEATURE_BACKLOG, USER_FLOWS,
Settings, DATA_MODELS, SECURITY_MODEL, INFRASTRUCTURE_DIAGRAM,
CONTENT_PIPELINE_ARCHITECTURE, THIRD_PARTY_DEPENDENCY_AUDIT, PRIVACY/TOS, support/
analytics/deploy/git/agents runbooks). Verified: no live subscription prices/SKUs
remain outside "this is dead" context.

**Still stale (deliberately deferred):**
- **4 strategy/economics docs** need a real rewrite, not find-replace — gated on the
  B2B-commitment decision: `BUSINESS_MODEL_CANVAS`, `GO_TO_MARKET_STRATEGY`,
  `VISION_PROBLEM_STATEMENT`, `MARKET_RESEARCH_COMPETITIVE_ANALYSIS`. They carry
  void subscription+B2B revenue projections and a B2B-heavy GTM.
- **Code (next task):** `mobile/src/config/tiers.ts` still encodes the dead 3-SKU
  subscription catalog → rewrite to exam-pack + bundle products; then rebuild
  `words.db` from `content-tool`. Pairs with the schema → `word_tiers` migration.
- **Budget figure:** kept canonical at **$194** everywhere (audio saving from
  dropping ElevenLabs → neural TTS is ~$40 *headroom*, not a reduced budget).
- **Latent (pre-existing, not monetization):** `EntitlementRepository` in
  DATA_MODELS exposes `getAll`/`upsert`, implying local persistence — contradicts
  the entitlements-memory-only invariant. Worth a separate look.

Related: [[2026-05-31_repo_state_reconciliation]]
