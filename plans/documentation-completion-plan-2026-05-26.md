# Plan: Documentation Completion and Canonical Consistency

**Date:** 2026-05-26  
**Status:** Partially complete — P0-01 and P0-02 resolved 2026-05-27. P0-03, P0-04, P1-02, P1-03, P1-04, P1-05 remain pending.  
**Mode:** Planning only  
**Scope:** Documentation only (`lexitap-docs/`, root planning docs, and `plans/`)  
**Constraint invariant:** Do not implement React Native, SQLite, content-tool, Supabase, native auth, IAP, or build-system code while executing this plan.

## Completion Log

| Item | Status | Date | Notes |
|------|--------|------|-------|
| P0-01: Entitlement authority conflict | ✅ Done | 2026-05-27 | Patched `Paywall.md`, `USER_FLOWS.md`, `SECURITY_MODEL.md`, `API_CONTRACT.md`, `SYSTEM_ARCHITECTURE.md`, `MONETIZATION_COMPLIANCE.md` |
| P0-02: SRS forgiveness freeze-field sync conflict | ✅ Done | 2026-05-27 | Patched `SRS_FORGIVENESS_MECHANICS.md`, `DATABASE_SCHEMA.md`, `API_CONTRACT.md` |
| P0-03: Auth provider alignment | ⏳ Pending | — | Multi-file: DATA_MODELS, TECH_STACK_DECISIONS, INFRASTRUCTURE_DIAGRAM, env/privacy docs |
| P0-04: B2B entitlement and teacher-code authority | ⏳ Pending | — | Entitlement-grant matrix not yet written across docs; `TeacherCodeRedemption.md` provisional-storage gap was addressed via screen-spec pass |
| P1-01: Screen-spec implementation readiness | ✅ Done (Phase A) | 2026-05-27 | All 13 screen spec retrofits completed; see `screens-improvement-plan.md` |
| P1-02: Analytics/event taxonomy alignment | ⏳ Pending | — | `ANALYTICS_PLAN.md`, `DATABASE_SCHEMA.md`, `DATA_MODELS.md` not yet aligned |
| P1-03: Phase and implementation-status accuracy | ⏳ Pending | — | Screen README, PRD, FEATURE_BACKLOG status labels not yet updated |
| P1-04: Canonical source map | ⏳ Pending | — | `lexitap-docs/README.md` "which doc wins" map not yet written |
| P1-05: Open questions triage | ⏳ Pending | — | Stale open-question labels not yet audited across all files |

## 1. Goal

Bring LexiTap documentation from "broadly healthy" to "implementation-grade": a future coding agent should be able to pick the correct source of truth, avoid stale decisions, and build within the architecture without rediscovering product intent from scattered docs.

This plan does **not** perform the documentation remediation. It records the deeper audit findings and defines the safest future edit sequence.

## 2. Deep Audit Summary

The broad 2026-05-24 audit issues are mostly remediated:

- Audience direction is consistent: global ESL learners only; American-student vocabulary is out of scope.
- Product thesis is no-typing recognition practice, not spelling-production.
- B2B monetization docs are generally risk-aware instead of claiming blanket compliance.
- Relative Markdown links are clean.
- Technical stack docs mostly match the repo pin: Expo SDK 52, React Native 0.76.5, TypeScript 5.7.

The deeper issue is **source-of-truth granularity**. Several docs use the same phrase, especially "SQLite is source of truth," for different concerns:

- Runtime learning/progress state while offline.
- Paid entitlement grant authority.
- Cloud mirror conflict resolution.
- Local UI rendering after a verified purchase.

Those are not the same. The future remediation should clarify authority by data class.

## 3. Canonical Authority Model to Adopt

Use this as the organizing principle for the future docs patch:

| Data class | Runtime source | Grant/write authority | Sync / replay rule |
|---|---|---|---|
| Bundled vocabulary content | `words.db` read-only | Content pipeline / shipped bundle | Replace content DB on versioned content update; never edits user DB |
| User progress / SRS | `user.db` | Local app domain/application logic | Cloud mirrors; last-write-wins by `last_reviewed_at`; append `quiz_attempts` for replay |
| Quiz attempts / event log | `user.db` append-only | Local app transaction | Never update/delete; compensating inserts only |
| Streak/freeze state | `user.db` | Local app, IANA civil date | Freeze fields are device-only per current schema/API docs; if synced later, needs explicit new decision |
| Verified paid entitlements | `user.db` for offline reads after grant | Store/RevenueCat/server-side validation for grant/revoke | Local row mirrors verified state; unverified local state must not unlock paid content |
| B2B/referral/promo entitlements | `user.db` for offline reads after grant | Supabase RPC / Edge Function / institutional backend | Review-sensitive; no in-app off-store steering |
| Account/auth data | Supabase Auth + `user_accounts` | Supabase Auth | Local device caches only what app needs |
| Analytics | `event_log` locally | Local app for functional events; off-device send obeys consent plan | Aggregate/off-device flow still needs final sink/consent decision |

This table should eventually live in `lexitap-docs/README.md` or `SYSTEM_ARCHITECTURE.md`, then be linked from the relevant category indexes.

## 4. P0 Reconciliation Work

### P0-01: Entitlement authority vs offline runtime source — ✅ RESOLVED 2026-05-27

**Conflict found:**

- Product, architecture, UX, and sync docs correctly say SQLite is the offline runtime source of truth.
- Paywall/user-flow docs currently imply a purchase success writes local `user_entitlements` first and unlocks immediately.
- Security/API/IAP code comments say receipt validation is trusted/server-side and the local entitlement is only persisted after verification.
- `UnlockTierUseCase` code is already named as a "verified purchase" persistence step, not a receipt validator.

**Future decision to document:**

SQLite is the offline read source for **verified** entitlements. It is not the grant authority for paid content.

Recommended purchase state machine:

1. User starts purchase through the IAP adapter.
2. Store/RevenueCat returns `cancelled`, `pending`, `error`, or a receipt token.
3. Receipt is validated by RevenueCat/server-side infrastructure; Supabase Edge Function is used where LexiTap owns the trusted write.
4. Only valid entitlements are persisted locally through `UnlockTierUseCase`.
5. The local entitlement unlocks offline runtime access after verification.
6. Revocation/refund flows update verified state and remove/expire local access on next validation/sync.

**Docs to update later:**

- `lexitap-docs/03-ux-design/USER_FLOWS.md`
- `lexitap-docs/03-ux-design/screens/Paywall.md`
- `lexitap-docs/04-technical-architecture/API_CONTRACT.md`
- `lexitap-docs/04-technical-architecture/SECURITY_MODEL.md`
- `lexitap-docs/04-technical-architecture/SYSTEM_ARCHITECTURE.md`
- `lexitap-docs/08-financial-legal/MONETIZATION_COMPLIANCE.md`
- `lexitap-docs/07-operations-compliance/GDPR_COPPA_COMPLIANCE.md`
- `lexitap-docs/07-operations-compliance/PRIVACY_POLICY_TERMS_OF_SERVICE.md`
- `lexitap-docs/07-operations-compliance/SUPPORT_ESCALATION_RUNBOOK.md`

**Acceptance criteria:**

- No doc says unverified paid content unlocks from a local write.
- Paywall copy still supports pending/deferred/offline cases.
- The phrase "SQLite source of truth" is scoped to offline runtime state and learning progress.
- `UnlockTierUseCase` is documented as "persist verified entitlement," not "perform purchase validation."

### P0-02: SRS forgiveness sync model vs current schema/API model — ✅ RESOLVED 2026-05-27

**Conflict found:**

- `SRS_FORGIVENESS_MECHANICS.md` still says new freeze fields are added to `user_stats_sync`.
- `DATABASE_SCHEMA.md` and `API_CONTRACT.md` later say freeze fields are deliberately device-only and `user_stats_sync` mirrors only streak/totals subset.
- The same SRS doc also contradicts itself on `freeze_count`: one section says keep higher on conflict; another says keep lower.

**Future decision to document:**

Use the current schema/API model unless product intentionally changes it:

- Freeze state remains device-only at MVP.
- `user_stats_sync` mirrors only streak/totals subset, if/when implemented.
- There is no cross-device freeze conflict rule at MVP because freeze state does not sync.
- If Phase 2 device-switch validation requires freeze sync, create a new ADR/plan before changing docs.

**Docs to update later:**

- `lexitap-docs/02-product-definition/SRS_FORGIVENESS_MECHANICS.md`
- `lexitap-docs/04-technical-architecture/DATABASE_SCHEMA.md`
- `lexitap-docs/04-technical-architecture/API_CONTRACT.md`
- `lexitap-docs/04-technical-architecture/DATA_MODELS.md`
- `lexitap-docs/03-ux-design/screens/SigninAccount.md`
- `lexitap-docs/07-operations-compliance/PRIVACY_POLICY_TERMS_OF_SERVICE.md`
- `lexitap-docs/07-operations-compliance/GDPR_COPPA_COMPLIANCE.md`

**Acceptance criteria:**

- No doc says freeze fields are both synced and device-only.
- No doc contains a live `higher` vs `lower` contradiction for `freeze_count`.
- Sign-in docs do not promise cross-device freeze continuity unless the sync model supports it.
- Streak continuity language distinguishes streak/totals sync from local freeze balance.

### P0-03: Auth provider alignment — ⏳ PENDING

**Conflict found:**

- Product roadmap, PRD, out-of-scope, app-store strategy, and sign-in screens say Sign in with Apple ships alongside Google in Phase 3.
- API, security, tech-stack, privacy, support, error monitoring, environment setup, and data models still describe only email + Google.
- `DATA_MODELS.md` currently types `authProvider` as `'email' | 'google'`.
- `FEATURE_BACKLOG.md` says account creation is email + Google, while IAP/paywall docs acknowledge Apple requirement elsewhere.

**Future decision to document:**

If Google remains in Phase 3, then Apple is also Phase 3. Email/password remains first-party. Magic-link vs password is a separate unresolved product/security decision.

**Docs to update later:**

- `lexitap-docs/04-technical-architecture/API_CONTRACT.md`
- `lexitap-docs/04-technical-architecture/SECURITY_MODEL.md`
- `lexitap-docs/04-technical-architecture/DATA_MODELS.md`
- `lexitap-docs/04-technical-architecture/TECH_STACK_DECISIONS.md`
- `lexitap-docs/04-technical-architecture/INFRASTRUCTURE_DIAGRAM.md`
- `lexitap-docs/05-engineering-process/ENVIRONMENT_SETUP.md`
- `lexitap-docs/07-operations-compliance/PRIVACY_POLICY_TERMS_OF_SERVICE.md`
- `lexitap-docs/07-operations-compliance/GDPR_COPPA_COMPLIANCE.md`
- `lexitap-docs/07-operations-compliance/SUPPORT_ESCALATION_RUNBOOK.md`
- `lexitap-docs/07-operations-compliance/ERROR_MONITORING_PLAN.md`
- `lexitap-docs/03-ux-design/screens/SigninAccount.md`
- `lexitap-docs/03-ux-design/screens/OnboardingAccountCreation.md`
- `lexitap-docs/02-product-definition/FEATURE_BACKLOG.md`

**Acceptance criteria:**

- Every auth-provider list includes the same canonical set or clearly states phase/scoping.
- `SigninAccount.md` no longer lists provider set as an open question.
- Magic-link vs password remains open only if intentionally undecided.
- No install/dependency doc implies `expo-apple-authentication` is installed before it is actually added.

### P0-04: B2B entitlement and teacher-code authority — ⏳ PENDING (partial)

**Conflict / incompleteness found:**

- B2B seat tokens, teacher advocate trials, promo codes, and store IAP all grant entitlements but use different trust boundaries.
- The docs correctly treat B2B off-store access as review-sensitive, but screen specs do not fully explain provisional teacher-code storage, `source_event_id` idempotency, or account-binding order.
- `TeacherCodeRedemption.md` allows constrained manual input even though no free typing is preferred; this is acceptable only because the no-typing rule is quiz-scoped, but the spec should be precise.

**Future decision to document:**

Create one entitlement-grant matrix:

| Grant source | User-facing entry | Authority | Local persistence |
|---|---|---|---|
| Store subscription / one-time IAP | Paywall / Restore | Store + RevenueCat/server validation | After verified |
| B2B institutional seat | Seat-token activation / portal | Supabase server-side token validation | After accepted |
| Teacher advocate trial | Teacher code redemption | Supabase RPC with `source_event_id` idempotency | After accepted |
| Promo code | Promo RPC | Supabase RPC decrement guard | After accepted |

**Docs to update later:**

- `lexitap-docs/04-technical-architecture/API_CONTRACT.md`
- `lexitap-docs/04-technical-architecture/SECURITY_MODEL.md`
- `lexitap-docs/03-ux-design/screens/TeacherCodeRedemption.md`
- `lexitap-docs/03-ux-design/screens/Paywall.md`
- `lexitap-docs/08-financial-legal/MONETIZATION_COMPLIANCE.md`
- `lexitap-docs/08-financial-legal/APP_STORE_DISTRIBUTION_STRATEGY.md`

**Acceptance criteria:**

- Teacher-code provisional state is defined: storage location, expiration, deduplication key, and bind-on-auth behavior.
- No screen suggests off-store purchase steering.
- B2B/institutional access is documented as review-sensitive, not guaranteed.

## 5. P1 Completeness Work

### P1-01: Screen-spec implementation readiness

Use `plans/screens-improvement-plan.md` as the detailed screen-spec execution plan. This plan adds the cross-doc priorities that should feed that work.

Highest-priority screen fixes:

1. `Paywall.md`: adopt verified-entitlement state machine, not local-first grant language.
2. `SigninAccount.md`: align provider set; clarify that freeze balance may be device-local even if streak/totals sync.
3. `OnboardingAccountCreation.md`: same provider alignment as sign-in.
4. `TeacherCodeRedemption.md`: define provisional storage/idempotency/account binding.
5. `Progress.md`: define 7-day show-up source query and skeleton state.
6. `QuizFeedbackStates.md`: explicitly name atomic SRS write path and event log write.
7. `SessionComplete.md`: resolve haptic trigger and route/overlay ownership.
8. `ForgivenessSheet.md`: link exact re-anchor mechanics and clarify hidden due-count usage.

**Acceptance criteria:**

- Every built or MVP-planned screen has a concrete target file or a clear "new file to create" destination.
- Open questions that are answered elsewhere are closed.
- Optional/future screens remain explicitly out of MVP unless a product doc pulls them into scope.
- No quiz-path spec implies free typing or `TextInput`.

### P1-02: Analytics/event taxonomy alignment

**Drift found:**

- Code currently writes `answer_recorded`.
- Analytics plan lists `word_reviewed`.
- SRS forgiveness defines `srs_backlog_reanchored`.
- Database schema comments say `answer_recorded` is emitted today and other events are planned.
- Screen plan proposes `content_error_reported`, but analytics/schema/API do not yet define the off-device destination.

**Future decision to document:**

Create one event taxonomy table with implementation status:

- `implemented-local`
- `planned-local`
- `planned-off-device`
- `requires-schema-addendum`

**Docs to update later:**

- `lexitap-docs/07-operations-compliance/ANALYTICS_PLAN.md`
- `lexitap-docs/04-technical-architecture/DATABASE_SCHEMA.md`
- `lexitap-docs/04-technical-architecture/DATA_MODELS.md`
- `lexitap-docs/02-product-definition/SRS_FORGIVENESS_MECHANICS.md`
- `plans/screens-improvement-plan.md` if content-error reporter remains in scope

**Acceptance criteria:**

- `answer_recorded` vs `word_reviewed` is resolved, aliased, or intentionally versioned.
- `srs_backlog_reanchored` appears in the analytics/event taxonomy if it is written to `event_log`.
- `content_error_reported` is clearly marked as requiring schema/sync work if planned.
- Analytics opt-out language distinguishes local functional logging from off-device analytics.

### P1-03: Phase and implementation-status accuracy

**Drift found:**

- Product docs defer ImageMatch and Classification to Phase 4, but code already contains components.
- Screen index says those specs are "built (Phase 4)" while PRD says they are deferred from MVP.
- IAP/Apple auth dependencies are planned but not installed.
- Some docs say `user_stats_sync` is planned while privacy docs imply it is part of the live data map.

**Future decision to document:**

Use four status labels consistently:

- `implemented`
- `implemented-but-deferred-from-MVP`
- `planned`
- `not-installed / stubbed`

**Docs to update later:**

- `lexitap-docs/02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md`
- `lexitap-docs/02-product-definition/FEATURE_BACKLOG.md`
- `lexitap-docs/03-ux-design/screens/README.md`
- `lexitap-docs/04-technical-architecture/API_CONTRACT.md`
- `lexitap-docs/08-financial-legal/THIRD_PARTY_DEPENDENCY_AUDIT.md`
- `lexitap-docs/05-engineering-process/DEPLOYMENT_RELEASE_RUNBOOK.md`

**Acceptance criteria:**

- Docs do not say planned dependencies are installed.
- Built-but-not-MVP components are not presented as current product scope.
- Privacy/data maps distinguish current implementation from planned mirrors.

### P1-04: Canonical source map

Add a short "which doc wins" map so future agents do not infer precedence by file age.

Recommended ownership:

- Audience and scope: `PRODUCT_REQUIREMENTS_DOCUMENT.md`, `OUT_OF_SCOPE.md`
- Sequencing: `02-product-definition/ROADMAP.md`
- UX behavior: `USER_FLOWS.md` and `03-ux-design/screens/`
- Visual design: `DESIGN_SYSTEM.md`
- Schema columns/invariants: `DATABASE_SCHEMA.md`
- Runtime type shapes: `DATA_MODELS.md`
- Cloud/API/RPC contracts: `API_CONTRACT.md`
- Trust/security boundaries: `SECURITY_MODEL.md`
- Revenue/compliance risk: `MONETIZATION_COMPLIANCE.md`
- Engineering agent rules: `AGENTS.md`, `AGENTS_CLAUDE.md`, `CODING_STANDARDS.md`
- Content pipeline/source rules: `CONTENT_PIPELINE_ARCHITECTURE.md`, `SEED_DATA_SPEC.md`

**Docs to update later:**

- `lexitap-docs/README.md`
- Category `README.md` files where helpful
- `AGENTS.md` only if current hard rules need doc precedence added

### P1-05: Open questions triage

Open questions are useful only when they are not stale.

Future pass should label each open item:

- `unresolved`
- `resolved elsewhere`
- `deferred`
- `requires external validation`
- `requires product decision`
- `requires implementation spike`

High-value examples:

- Sign in with Apple provider set: resolved if Google remains Phase 3.
- Audio autoplay: resolved as tap-to-play by accessibility doc.
- Freeze sync merge: not a simple open question if freeze state is device-only.
- Analytics consent: external/privacy decision.
- Definition authoring source and image licensing: content pipeline decisions.
- B2B App Review acceptance: external validation/counsel.

### P1-06: Roadmap, blocker, and phase-state reconciliation

**Drift found:**

- Root `ROADMAP.md` and canonical `lexitap-docs/02-product-definition/ROADMAP.md` are aligned in audience, but they use different phase labels in places (`Subscription & Bulk Beta` vs `First Paid Tier`, `Launch Wave Content Drops` vs `Launch Wave Tiers`) and different at-a-glance wording.
- Both roadmaps say there are "3 Phase 1 blockers"; two are marked resolved, while Backlog #42 is research-based complete but first-person hands-on remains outstanding because Knowji appears closed. That makes "resolve 3 blockers" ambiguous: is Phase 1 blocked by an impossible first-person teardown, or is the remaining task now "brand finalization using research-based teardown"?
- `docs-audit-2026-05-24.md` is historical and intentionally preserves pre-remediation findings, but future readers may mistake old line references for current truth unless it is clearly marked as historical evidence.

**Future decision to document:**

Treat `lexitap-docs/02-product-definition/ROADMAP.md` as canonical. The root `ROADMAP.md` should be an at-a-glance mirror with no independent semantics.

Backlog #42 should be reclassified:

- If first-person Knowji teardown is impossible because the app is unavailable, mark the blocker resolved by desk research and record the limitation.
- If brand finalization still needs more evidence, create a new explicit brand task rather than leaving the old blocker half-open.

**Docs to update later:**

- `ROADMAP.md`
- `lexitap-docs/02-product-definition/ROADMAP.md`
- `lexitap-docs/01-discovery-strategy/MARKET_RESEARCH_COMPETITIVE_ANALYSIS.md`
- `lexitap-docs/03-ux-design/DESIGN_SYSTEM.md`
- `plans/docs-audit-2026-05-24.md` only if adding a short "historical audit" note is useful

**Acceptance criteria:**

- Root roadmap and canonical roadmap use the same phase names or explicitly say root names are summaries.
- No checklist says "Resolve 3 blockers" when the blockers are already resolved/reclassified.
- Brand identity blocker has a clear owner and next action.
- Historical audit findings are not confused with current unresolved defects.

### P1-07: Pricing, tier, and SKU vocabulary alignment

**Drift / ambiguity found:**

- PRD says MVP includes Foundation plus TOEFL premium-content path for validation, while other docs describe Advanced as a free launch tier and Common 3000 as a one-time launch SKU.
- Pricing docs list `com.lexitap.common3k` as a $1.99 "Common 3000 Unlock," but the product story also describes Foundation as top 3,000 free words and Advanced as 3,001-9,000. The term "Common 3000" can be confused with the free Foundation tier unless its content boundary is defined.
- App Store strategy says there are no individual-tier SKUs except Common 3000 and Premium Pass; database docs say Premium-bundled tiers have `sku: null`, while pricing docs list SKU-like identifiers for product rows. This is probably compatible, but it needs a single SKU/product glossary.
- Revenue and analytics docs use "tier mix" across TOEFL/IELTS/Business/Common3K/Premium Pass; product docs say Premium Pass is the monetized SKU for all paid content. Analytics should distinguish content consumed from product purchased.

**Future decision to document:**

Create a pricing/tier glossary:

- `content tier`: rows in `content_tiers` / `words.db`.
- `store product`: App Store / Play SKU.
- `entitlement`: local verified access row.
- `Premium Pass`: store product that grants all current/future paid content tiers.
- `Common 3000`: define exact content boundary and relationship to free Foundation, or rename it to avoid overlap.

**Docs to update later:**

- `lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md`
- `lexitap-docs/08-financial-legal/APP_STORE_DISTRIBUTION_STRATEGY.md`
- `lexitap-docs/04-technical-architecture/DATABASE_SCHEMA.md`
- `lexitap-docs/04-technical-architecture/DATA_MODELS.md`
- `lexitap-docs/02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md`
- `lexitap-docs/02-product-definition/FEATURE_BACKLOG.md`
- `lexitap-docs/07-operations-compliance/ANALYTICS_PLAN.md`
- `lexitap-docs/03-ux-design/screens/Paywall.md`

**Acceptance criteria:**

- No reader can confuse free Foundation with paid Common 3000.
- Store products and content tiers are named separately.
- Analytics distinguishes "product purchased" from "content tier studied/unlocked."
- Premium Pass auto-unlock behavior remains one canonical rule.

### P1-08: Content provenance, licensing, and enrichment gates

**Drift / risk found:**

- Content pipeline docs say sourcing is resolved and the founder possesses the corpora.
- Third-party dependency audit still lists word-list provenance as an open question tied to P0 content sourcing.
- Seed-data docs cite reference authorities for QA, but some wording risks implying copying from proprietary dictionaries or test-prep sources. The docs also say "GRE uses Merriam-Webster definitions verbatim," which conflicts with the no-verbatim-copy rule in the same file.
- Unsplash imagery and ElevenLabs audio are treated as planned low-cost resources, but redistribution/attribution rights remain open before paid launch.
- Definition sourcing is still open: founder-authored vs generated/cleaned by OpenAI with mandatory human review.

**Future decision to document:**

Separate three concepts:

- `source corpus provenance`: where the word list/frequency ranking came from and its license.
- `reference authority`: dictionaries/corpora used only to verify meaning/register, not copied.
- `LexiTap-authored content`: definitions/examples/media metadata actually shipped.

**Docs to update later:**

- `lexitap-docs/06-content-data/CONTENT_PIPELINE_ARCHITECTURE.md`
- `lexitap-docs/06-content-data/SEED_DATA_SPEC.md`
- `lexitap-docs/08-financial-legal/THIRD_PARTY_DEPENDENCY_AUDIT.md`
- `lexitap-docs/04-technical-architecture/TECH_STACK_DECISIONS.md`
- `lexitap-docs/05-engineering-process/AGENTS_CLAUDE.md`

**Acceptance criteria:**

- Every shipped corpus has a recorded source and license/provenance note.
- QA references cannot be mistaken for permission to copy proprietary definitions.
- No doc says to use any dictionary definition verbatim.
- Audio and imagery redistribution checks are explicit launch gates for paid tiers.
- AI-generated enrichment is always followed by human review before `is_active = 1`.

### P1-09: Compliance/currentness registry

**Drift found:**

- Several docs include "Official Source Currentness" sections or rely on current external platform rules: Apple App Review, Google Play Payments, RevenueCat pricing, Supabase quotas, Expo SDK, Stripe fees, Sentry/PostHog free tiers, Unsplash/ElevenLabs licenses.
- These facts are time-sensitive and should not be treated as permanently true because the docs were once corrected.

**Future decision to document:**

Maintain a small currentness registry with:

- external source
- doc(s) depending on it
- last verified date
- next verification trigger
- owner/action before launch

**Docs to update later:**

- `lexitap-docs/08-financial-legal/*`
- `lexitap-docs/05-engineering-process/DEPLOYMENT_RELEASE_RUNBOOK.md`
- `lexitap-docs/05-engineering-process/CI_CD_PIPELINE.md`
- `lexitap-docs/07-operations-compliance/*`
- `lexitap-docs/04-technical-architecture/TECH_STACK_DECISIONS.md`

**Acceptance criteria:**

- Launch/runbook docs say which external facts must be rechecked before submission.
- Legal/compliance docs retain "not legal advice" posture.
- Time-sensitive vendor claims include a verification date or are phrased as planning assumptions.

## 6. P2 Cleanup Work

### P2-01: Reference/link target drift

Known cleanup:

- `SYSTEM_ARCHITECTURE.md` references the Paywall Reviewer in `CODING_STANDARDS.md`, but the reviewer checklist lives in `AGENTS_CLAUDE.md`.
- `DATABASE_SCHEMA.md` says the soft-delete convention is enforced by `CODING_STANDARDS.md`; the detailed reviewer checklist is also in `AGENTS_CLAUDE.md`.
- "See Open Questions" references should point to the exact owner section when the decision is still open.

### P2-02: Index freshness

The root docs index can stay concise, but future edits should ensure:

- Screen inventory status reflects current code and product phase.
- Any new screen spec from `plans/screens-improvement-plan.md` is indexed.
- Historical audit counts are not presented as evergreen counts.
- Category README summaries mention whether a doc is canonical, status-tracking, or operational.

### P2-03: Content-data open questions

Some content-data questions are now P1 because they gate paid content/legal readiness (see P1-08). The remaining lower-risk questions matter before Track A is treated as complete:

- Audio voice/accent choice remains open.
- L1 gloss localization is intentionally deferred but should not be implied by MVP docs.
- Foundation/Advanced image coverage is a curation-time decision; keep it out of MVP scope unless explicitly chosen.
- Difficulty banding can default to `3`, but the default should be documented as a launch simplification, not a hidden model.

Keep these in content docs; do not let them leak into app implementation as assumed features.

### P2-04: Open-question registry hygiene

The open-question scan shows many healthy unresolved decisions, but they need consistent shape.

Recommended future format:

```md
- **Question:** ...
  - Status: unresolved | deferred | resolved elsewhere | requires external validation | requires product decision | requires implementation spike
  - Owner: product | engineering | content | compliance | founder | counsel
  - Trigger: before Phase 3 | before paid tier activation | post-launch data | etc.
```

This is especially useful for:

- legal/store review questions
- analytics consent choices
- content licensing/provenance
- a11y device test matrix
- provider/vendor free-tier limits
- roadmap blockers

## 7. Suggested Execution Order

1. **Authority decision pass:** Adopt the canonical authority table in Section 3.
2. **P0 patch pass:** Reconcile entitlement authority, freeze sync, auth providers, and B2B grant authority.
3. **Roadmap/blocker pass:** Reclassify Backlog #42 and align root/canonical phase language.
4. **Pricing/tier pass:** Separate content tiers, store products, and entitlements.
5. **Content provenance pass:** Resolve source/license/reference-authority wording and paid-tier media gates.
6. **Event taxonomy pass:** Align `event_log`, analytics, and planned content-error reporting.
7. **Screen-spec pass:** Execute the relevant pieces of `plans/screens-improvement-plan.md`.
8. **Status-label pass:** Normalize implemented/planned/deferred/stubbed language.
9. **Open-question pass:** Classify or close stale questions.
10. **Currentness pass:** Add verification dates/triggers for external vendor/platform claims.
11. **Index/source-map pass:** Add the doc precedence map and refresh indexes.
12. **Hygiene pass:** Run verification scans and link checks.

## 8. Verification Checklist

Run after the future documentation edit pass:

```bash
python3 - <<'PY'
from pathlib import Path
import re, urllib.parse
root = Path('.')
files = list((root / 'lexitap-docs').rglob('*.md')) + [root / 'ROADMAP.md', root / 'AGENTS.md', root / 'CLAUDE.md']
pat = re.compile(r'\[[^\]]+\]\(([^)]+)\)')
broken = []
for f in files:
    if not f.exists():
        continue
    for i, line in enumerate(f.read_text().splitlines(), 1):
        for m in pat.finditer(line):
            link = m.group(1).strip()
            if link.startswith(('http://', 'https://', 'mailto:', '#')):
                continue
            target = urllib.parse.unquote(link.split('#', 1)[0])
            if target and not (f.parent / target).resolve().exists():
                broken.append((f, i, link))
print('\n'.join(f'{f}:{i}: {link}' for f, i, link in broken) or 'NO BROKEN RELATIVE LINKS')
PY

rg -n "SpellingActiveRecall|parents|high schoolers|fully compliant|100% compliant|\\$144|MRR|expo-in-app-purchases" lexitap-docs ROADMAP.md AGENTS.md CLAUDE.md
rg -n "freeze_count|freezes_granted_total|last_catchup_anchor_date|user_stats_sync|device-only|higher|lower" lexitap-docs/02-product-definition/SRS_FORGIVENESS_MECHANICS.md lexitap-docs/04-technical-architecture lexitap-docs/07-operations-compliance
rg -n "Sign in with Apple|Google OAuth|Google Sign|authProvider|email \\+ Google|email or Google|magic-link|magic link" lexitap-docs
rg -n "local source of truth|SQLite is the source of truth|source of truth = SQLite|Entitlement write|verified entitlement|receipt validated|validate_receipt|syncPurchases" lexitap-docs
rg -n "answer_recorded|word_reviewed|srs_backlog_reanchored|content_error_reported|event_type" lexitap-docs mobile/src
rg -n "target_file: TBD|Which auth providers ship|Audio autoplay|Provider set at MVP|Open questions" lexitap-docs/03-ux-design/screens
rg -n "Common 3000|common3k|Foundation|Premium Pass|store product|content tier|tier mix|product purchased" lexitap-docs
rg -n "verbatim|Merriam-Webster|Oxford|Cambridge|COCA|Unsplash|ElevenLabs|redistribution|provenance|license|reference authority|official source" lexitap-docs/06-content-data lexitap-docs/08-financial-legal
rg -n "Backlog #42|Knowji|Phase 1 blockers|Resolve 3 Phase 1 blockers|Subscription & Bulk Beta|First Paid Tier|Launch Wave Content Drops|Launch Wave Tiers" ROADMAP.md lexitap-docs/02-product-definition/ROADMAP.md lexitap-docs/01-discovery-strategy lexitap-docs/03-ux-design
rg -n "Official Source Currentness|retrieved|last verified|free tier|pricing|quota|Guideline|policy" lexitap-docs/04-technical-architecture lexitap-docs/05-engineering-process lexitap-docs/07-operations-compliance lexitap-docs/08-financial-legal
git diff --check
```

Manual verification:

- Each P0 topic has one canonical statement and no contradictory local wording.
- "SQLite source of truth" is not used to bypass trusted purchase/referral validation.
- Sign-in/account docs distinguish provider-set decisions from magic-link/password decisions.
- Freeze fields are either consistently device-only or consistently synced with a documented merge rule.
- Event taxonomy includes every event the docs or code say is written.
- Root roadmap is a mirror of the canonical roadmap, not a competing plan.
- Pricing docs distinguish content tiers, store products, and entitlements.
- Content docs distinguish source corpus, reference authority, and shipped LexiTap-authored content.
- Time-sensitive platform/vendor claims have verification dates or launch recheck triggers.
- Legal/compliance docs avoid absolute conclusions pending counsel/store review.
- No implementation code was changed as part of the documentation pass.

## 9. Non-Goals

- Do not implement missing screens.
- Do not add migrations, tables, Supabase functions, or analytics sinks.
- Do not install RevenueCat, Apple auth, Google auth, or any native dependency.
- Do not create final legal advice; keep legal/compliance docs as planning drafts pending counsel/review.
- Do not resolve content sourcing/licensing by assumption; record decisions only when the founder chooses them.
