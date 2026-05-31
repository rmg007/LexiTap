---
title: Revenue Model and Pricing Sheet
category: financial-legal
status: active
updated: 2026-05-31
priority: P0
tags: [revenue, pricing, one-time-packs, exam-packs, bundle, entitlements, upgrade-skus, audio-free, arppu, projections, store-commission]
---

# Revenue Model and Pricing Sheet

This is the decision-grade pricing and revenue reference for LexiTap. It expands the product definition in [../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md](../02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md).

LexiTap is a solo-founder ESL vocabulary app. The audience is global ESL test-takers (TOEFL/IELTS/GRE/GMAT) studying against a deadline.

> **2026-05-31 — model replaced.** The previous "Premium Pass subscription ($4.99/mo, $24.99/yr) + $1.99 Common 3000 standalone + B2B seat packs" model is **dead**. It was rebuilt from first principles. See [Why This Model](#why-this-model-the-rethink) for the full reasoning. Do not resurrect subscriptions or the standalone Common 3000 SKU without re-opening that argument.

---

## Contents

- [Pricing Sheet (Locked)](#pricing-sheet-locked)
- [Why This Model (the rethink)](#why-this-model-the-rethink)
- [What Is Free vs Paid](#what-is-free-vs-paid)
- [Entitlements & Access Checks](#entitlements--access-checks)
- [Purchase Paths: Add-a-Pack and Upgrade-to-Bundle](#purchase-paths-add-a-pack-and-upgrade-to-bundle)
- [Audio: Free, on Cheap Neural TTS](#audio-free-on-cheap-neural-tts)
- [Net Revenue Per Transaction](#net-revenue-per-transaction)
- [Revenue Projections (needs re-modeling)](#revenue-projections-needs-re-modeling)
- [B2B (Deferred — Door Left Open)](#b2b-deferred--door-left-open)
- [Repricing Discipline](#repricing-discipline)
- [Glossary](#glossary)
- [Open Questions](#open-questions)

---

## Pricing Sheet (Locked)

Locked through launch. Do not change without satisfying the repricing triggers below.

### Summary: Free vs Paid

| Category | Tiers | Price | Notes |
|----------|-------|-------|-------|
| **Free (no purchase)** | Foundation, Advanced, Most Common 3000, Most Common 9000 | $0.00 | All frequency/CEFR content + word/sentence audio. Many-to-many tags; words overlap across tiers. |
| **Paid (one-time)** | TOEFL, IELTS, GRE, GMAT, Business English | $9.99 each | Rare academic words disjoint from free frequency bands. Exam-curated study sets. |
| **Paid (one-time bundle)** | All-Exams Bundle | $29.99 | Unlocks every exam pack (current + future). |
| **Paid (upgrade SKUs)** | All-Exams Upgrade (own 1 pack / own 2 packs) | $19.99 / $9.99 | Discounted path from individual packs to bundle. |

### Consumer Products (In-App Purchase, one-time non-consumables)

| SKU | Product | Type | Price | Grants entitlement |
|-----|---------|------|-------|--------------------|
| — (no SKU) | Foundation, Advanced, Most Common 3000, Most Common 9000 | Free | $0.00 | always unlocked |
| `com.lexitap.exam.toefl` | TOEFL Pack | One-time unlock | $9.99 | `exam_toefl` |
| `com.lexitap.exam.ielts` | IELTS Pack | One-time unlock | $9.99 | `exam_ielts` |
| `com.lexitap.exam.gre` | GRE Pack | One-time unlock | $9.99 | `exam_gre` |
| `com.lexitap.exam.gmat` | GMAT Pack | One-time unlock | $9.99 | `exam_gmat` |
| `com.lexitap.exam.business` | Business English Pack | One-time unlock | $9.99 | `exam_business` |
| `com.lexitap.bundle.full` | All-Exams Bundle | One-time unlock | $29.99 | `all_exams` |
| `com.lexitap.bundle.upgrade1` | All-Exams Upgrade (own 1 pack) | One-time unlock | $19.99 | `all_exams` |
| `com.lexitap.bundle.upgrade2` | All-Exams Upgrade (own 2 packs) | One-time unlock | $9.99 | `all_exams` |

**Rules:**
- **Exam packs are uniformly priced at $9.99.** Uniform pricing is load-bearing — it keeps the upgrade math clean (see [upgrade paths](#purchase-paths-add-a-pack-and-upgrade-to-bundle)). Do not introduce per-exam price variation.
- **No subscriptions.** No monthly, no annual, no "Premium Pass."
- **The `all_exams` bundle includes all current AND future exam packs.** Ship GRE six months post-launch → existing bundle owners get it free. This is the bundle's core promise.

---

## Why This Model (the rethink)

The prior model paywalled word lists behind a subscription. Four things were wrong with it:

1. **Subscriptions fight the audience's actual behavior.** TOEFL/IELTS prep is a deadline-driven sprint: buy → cram → pass → leave. The old model's own ARPPU math assumed subscribers churn at **2.5 months** — a $24.99 annual that churns there collects only **$12.48**. A **$9.99–$29.99 one-time pack collects more from the same user**, with zero renewal/churn/refund ops. For a finite need, "recurring" revenue was a fiction.

2. **Overlapping categories break content-as-paywall.** A word like *feature* belongs to Foundation **and** Most Common 3000 **and** an exam list simultaneously (many-to-many tags). If the TOEFL list is ~80% words also present in the free frequency tiers, paywalling "the TOEFL list" sells the buyer almost nothing new. **Content-as-paywall only works when paid content is disjoint from free content.** So the paywall moved off "lists" and onto what is genuinely disjoint and costly: the rare academic words a frequency list never surfaces + exam-curated study sets + exam-format drilling.

3. **The only genuinely recurring revenue was B2B — now deferred.** Cram-school seat packs renewed annually (new cohorts). With B2B deferred, the business is **100% one-time consumer transactions**. That is a smaller, honest, transactional business — and a far simpler one for a solo founder to operate.

4. **Audio is pedagogically essential, so it cannot be the paywall.** These are non-native speakers; hearing a word is fundamental to learning it, not a premium feature. Audio is now **free and universal** (table stakes), which removes it as a paid lever and confirms the paywall must be exam-specific content + curation.

---

## What Is Free vs Paid

**Free (no purchase, ever):**
- All frequency/CEFR content: **Foundation** (A2–B1), **Advanced** (B2–C1), **Most Common 3000**, **Most Common 9000**.
- Word **and** sentence **audio** on all of it.
- The full learning system: SRS, streaks, themes, progress.

**Paid (one-time exam packs):**
- The genuinely-rare academic/exam words **disjoint from the free frequency bands** (the words a frequency list will never surface).
- "Study exactly the {exam} set" curation.
- Exam-format drilling.

This is the Magoosh/Manhattan model: free high-frequency on-ramp, paid exam-specific depth. It converts for deadline-driven test-takers.

---

## Entitlements & Access Checks

RevenueCat is the runtime entitlement authority. **Entitlement state is memory-only — never written to `user.db`** (SECURITY_MODEL invariant).

- Each pack grants a per-pack entitlement: `exam_toefl`, `exam_ielts`, `exam_gre`, `exam_gmat`, `exam_business`.
- The bundle (and both upgrade SKUs) grant `all_exams`, a superset that covers every current and future exam pack.
- Access check, everywhere:

  ```
  hasAccess(pack) = isFree(pack)
                 OR owns(pack-entitlement)
                 OR owns(all_exams)
  ```

- Free categories are never gated — they are just content tags, not products.

---

## Purchase Paths: Add-a-Pack and Upgrade-to-Bundle

### Owns TOEFL, wants IELTS too → trivial (the happy path)

IELTS is an independent one-time product. Buy it ($9.99); RevenueCat grants `exam_ielts` **alongside** the existing `exam_toefl`. Entitlements stack. No upgrade logic, no edge case. This additive behavior is the core payoff of one-time packs.

### Owns TOEFL ($9.99), wants the All-Exams bundle → discounted upgrade SKU

**The hard constraint:** App Store and Google Play have **no native upgrade path for non-consumables** (proration exists only for subscriptions, which we killed). Doing nothing means the buyer pays $29.99 *on top of* their $9.99 = **$39.99 for a $29.99 product** → refund requests and 1-star reviews.

The fix is **gated upgrade SKUs priced at `bundle − already-paid`**:

| Customer owns | App shows | Price | Grants |
|---|---|---|---|
| nothing | `bundle.full` | $29.99 | `all_exams` |
| 1 pack | `bundle.upgrade1` | **$19.99** | `all_exams` |
| 2 packs | `bundle.upgrade2` | **$9.99** | `all_exams` |
| 3+ packs | (buy remaining packs individually) | $9.99 ea | per-pack |

- The client reads current entitlements from RevenueCat and offers the correct SKU.
- **Owns 3+ and wants the rest:** rare — let them buy remaining packs individually. Do **not** build `upgrade3`.
- Uniform $9.99 pack pricing is what makes `bundle − paid` a clean subtraction. Vary pack prices and this table becomes combinatorial.

---

## Audio: Free, on Cheap Neural TTS

All audio (word + sentence) is free on all content. The budget only permits this on a **cheap neural TTS, not ElevenLabs**:

| TTS | ~9,000 unique free words, word+sentence | Verdict |
|---|---|---|
| ElevenLabs | ~$100–160 | **Breaks the $194 budget 2×+. Do not use.** |
| Amazon Polly / Google neural | ~$5–10 | Fits inside the existing ~$50 audio line with room to spare. **Use this.** |

**Action:** the roadmap's "TOEFL audio via ElevenLabs (~$50)" assumption is replaced by "universal audio via Polly/Google neural (~$10)." Neural voices are clean enough for ESL pronunciation modeling.

---

## Net Revenue Per Transaction

Apple Small Business Program + Google 15% tier → **15% store commission**, managed via RevenueCat.

- **$9.99 exam pack:** Gross $9.99 → Net (15%) = **$8.49**
- **$19.99 bundle upgrade:** Gross $19.99 → Net (15%) = **$16.99**
- **$29.99 All-Exams bundle:** Gross $29.99 → Net (15%) = **$25.49**

---

## Revenue Projections (needs re-modeling)

⚠️ The old Years 1–3 projections are **void** — they assumed subscription LTV and ~50% of net revenue from B2B. With B2B deferred and subscriptions removed, the business is pure one-time B2C.

**Illustrative Year 1 (rough, replace with a real model):**
- 10,000 active users · ~1.5% pay · blended net ~$13/payer (one pack → bundle range, $8.49–$25.49 net) ≈ **~$2,000 net**.
- Comfortably covers the **$194** cost base; materially below the old $3,708 figure (which leaned on B2B).
- No ARR, no recurring — revenue is transactional. Re-running a proper projection (conversion sensitivity, bundle-attach rate, multi-exam takers) is an **open task**.

---

## B2B (Deferred — Door Left Open)

B2B cram-school seat sales are **deferred out of the initial launch. Build nothing B2B now** — no Stripe, no web checkout, no seat-management portal, no in-app redemption.

But **design the entitlement model so a future "school grants N seats" path slots in without a rewrite**: a server-authoritative seat grant would map onto the same `all_exams` (or per-pack) entitlement surface the consumer path already uses. Leaving the door open costs nothing now. (The prior B2B seat-redemption code was already removed in the 2026-05-28 cleanup; do not rebuild it for v1.)

---

## Repricing Discipline

- **Launch pricing freeze:** $9.99 packs / $29.99 bundle / $19.99–$9.99 upgrades frozen through launch.
- **First repricing review** after **100 paying customers**.
- **Gated by data:** changes require documented evidence (low bundle-attach rate → adjust bundle price; high single-pack-only behavior → adjust pack price or bundle discount).

---

## Glossary

| Term | Definition |
|------|------------|
| **content category** | A named tag on a word in `words.db` (e.g., `foundation`, `advanced`, `common3k`, `common9k`, `toefl`). **Many-to-many** — one word carries several. Read-only, bundled at build time. Categories are *not* products. |
| **store product** | An App Store / Google Play one-time non-consumable SKU (e.g., `com.lexitap.exam.toefl`). Managed via RevenueCat. |
| **entitlement** | The verified right to access paid content, granted by RevenueCat after purchase. Memory-only — never written to `user.db`. |
| **exam pack** | A one-time $9.99 purchase unlocking an exam's curated study set: the rare academic words disjoint from the free bands + exam-format practice. Grants `exam_{name}`. |
| **All-Exams bundle** | A one-time $29.99 purchase granting `all_exams`, which unlocks every exam pack — **current and future**. |
| **upgrade SKU** | A gated, discounted bundle purchase (`bundle.upgrade1/2`) priced at `$29.99 − already-paid`, so a pack owner can move to the bundle without paying twice. Grants `all_exams`. |
| **Foundation / Advanced / Most Common 3000 / 9000** | Free content categories. Always unlocked; no product. |

---

## Open Questions

- `open` — **Re-model Years 1–3 projections** for the pure one-time B2C business (conversion %, bundle-attach rate, multi-exam-taker share). The old model is void.
- `open` — **Exam pack price point:** $9.99 is the working assumption; validate against willingness-to-pay before store config. Bundle at $29.99 anchors a 5-pack universe ($49.95 individually) as a clear discount.
- `deferred` — **Regional/localized pricing** for emerging-market learners. Post-launch.
- `deferred` — **B2B seat model** — full design when/if B2B is taken off the shelf.
