# LexiTap Full Docs Audit

Audit date: 2026-05-24
Scope: all 54 Markdown files present before this report was created, with priority on `lexitap-docs/` as the canonical documentation layer.
Mode: initial report-only audit; follow-up remediation completed after review in the same docs-audit branch. Historical evidence below preserves pre-remediation line references.

## Remediation Status

Follow-up patch pass completed on 2026-05-24:

- P0 audience, no-typing product thesis, and B2B compliance wording conflicts were reconciled across root docs and `lexitap-docs/`.
- P1 Stripe, RevenueCat, Supabase, Expo SDK, Sign in with Apple, roadmap-state, and dependency-installation currentness issues were corrected.
- P2 budget, path, metadata, frontmatter, stale-pricing, and duplicate-source cleanup was completed.
- Final hygiene passed after remediation: 55 Markdown files checked, 0 broken relative links; targeted stale-term scans clean; `git diff --check` clean.

Second-pass remediation completed on 2026-05-27 (via `documentation-completion-plan-2026-05-26.md` and `screens-improvement-plan.md`):

- **Entitlement authority** (P0-01): Corrected purchase state machine across `Paywall.md`, `USER_FLOWS.md`, `SECURITY_MODEL.md`, `API_CONTRACT.md`, `SYSTEM_ARCHITECTURE.md`, `MONETIZATION_COMPLIANCE.md`. No doc now implies an unverified local write unlocks paid content.
- **SRS forgiveness freeze-field sync conflict** (P0-02): Resolved contradictions in `SRS_FORGIVENESS_MECHANICS.md`, `DATABASE_SCHEMA.md`, `API_CONTRACT.md`. Freeze fields are consistently documented as device-local only, excluded from `user_stats_sync`, with no multi-device merge rule.
- **ROADMAP accuracy**: Both `ROADMAP.md` (root) and `lexitap-docs/02-product-definition/ROADMAP.md` updated to reflect Phase 1 active, Track A complete, Track B ~85% built.
- **Design system open questions**: All 3 resolved in `DESIGN_SYSTEM.md`. Light-mode `bgSurfaceRaised` token fixed in `mobile/src/presentation/theme/tokens.ts` (`#FFFFFF` → `#F7F9F9`).
- **Screen spec gaps** (P1-01 Phase A): 13 screen specs patched — triple-channel streak states, forgiveness constants, SRS write paths, ARIA strings, copy banks, haptic timing, SRS seed boundaries, pseudo-word rules, provisional teacher-code storage. See `screens-improvement-plan.md` for full list.

Remaining open from 2026-05-27 audit: P0-03 (auth provider alignment), P0-04 (B2B entitlement matrix), Phase B new screen drafts, analytics event taxonomy alignment, canonical source map.

## Executive Summary

The documentation set is structurally healthy: the canonical `lexitap-docs/` layer is complete, indexed, and has no broken relative Markdown links. The main issue is conceptual drift. Several older docs still define LexiTap around active spelling / spelling-assembly recall, while the current `AGENTS.md` hard rule says quiz and assessment UX must be passive recognition only: tap, drag, match, classify, with no `TextInput`.

The second major risk is monetization compliance. Current docs repeatedly state that B2B web-purchased seat tokens are fully compliant and bypass store IAP fees. Apple and Google rules are more nuanced than that, and Apple Guideline 3.1.1 explicitly treats license-key style unlocks as a risk unless an exception applies. This should be treated as legal/review risk, not a settled implementation fact.

## Audit Inventory

- Markdown files found before this report: 54. Current count after adding this report: 55.
- Canonical docs under `lexitap-docs/`: 42 non-README docs plus 9 category/root README files.
- Relative Markdown link check: 0 broken links.
- Existing uncommitted changes preserved:
  - `AGENTS.md` is untracked.
  - `lexitap-docs/02-product-definition/ROADMAP.md` is modified.
  - `lexitap-docs/06-content-data/SEED_DATA_SPEC.md` is modified.
  - `lexitap-docs/07-operations-compliance/GDPR_COPPA_COMPLIANCE.md` is modified.
  - `lexitap-docs/08-financial-legal/APP_STORE_DISTRIBUTION_STRATEGY.md` is modified.

## P0 Blockers

### P0-01: Root roadmap targets the wrong validation audience

Evidence:
- `ROADMAP.md:37` gates Phase 0 on `7/10 parents`.
- `ROADMAP.md:39` requires interviewing `10 parents`.
- `ROADMAP.md:40` requires interviewing `5 high schoolers`.
- `AGENTS.md:3` says LexiTap serves global ESL learners only and must never blend in American-student vocabulary.
- `lexitap-docs/02-product-definition/ROADMAP.md:39-45` already has the corrected validation audience: TOEFL/IELTS test-takers plus cram school directors.

Impact:
- A contributor using the root roadmap could recruit and validate against the explicitly excluded audience.
- This can invalidate Phase 0 evidence and feed the wrong product positioning.

Recommended fix:
- Reconcile `ROADMAP.md` with `lexitap-docs/02-product-definition/ROADMAP.md`.
- Replace parents/high-schoolers with adult ESL test-takers and ESL/cram-school operators.
- Add a short note that the root roadmap is an at-a-glance mirror of the canonical product roadmap.

### P0-02: PRD conflicts with the current no-typing / passive-recognition rule

Evidence:
- `AGENTS.md:30` bans `TextInput` in quiz/assessment paths and defines passive recognition as tap/drag/match/classify only.
- `lexitap-docs/02-product-definition/OUT_OF_SCOPE.md:21-23` puts active production typing/speaking out of scope.
- `lexitap-docs/02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md:38` names active recall spelling assembly as a core differentiator.
- `lexitap-docs/02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md:47` requires a spelling-assembly quiz loop.
- `lexitap-docs/02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md:73` lists `SpellingActiveRecall` as an MVP widget.
- `lexitap-docs/02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md:92-95` requires spelling assessments and scrambled-letter assembly.
- `lexitap-docs/02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md:119` specifies `SpellingActiveRecall`.
- `lexitap-docs/02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md:126` makes active spelling responses part of mastery rules.
- Actual code currently exposes `MultipleChoice`, `DragDrop`, `ImageMatch`, and `Classification`; there is no `SpellingActiveRecall` implementation under `mobile/src/presentation/components/assessments/`.

Impact:
- The PRD is P0 and authoritative, so implementers could build the wrong core UX.
- The SRS/mastery model can diverge if active spelling has special promotion rules but the current product direction is recognition-only.

Recommended fix:
- Rewrite the PRD around passive recognition widgets: MultipleChoice and DragDrop for MVP, ImageMatch and Classification deferred.
- Remove `SpellingActiveRecall` as an MVP requirement unless the product decision has intentionally changed back.
- Replace “active spelling proficiency” metrics with recognition accuracy, retention, and review-completion metrics.

### P0-03: Strategy and GTM docs still market active spelling as the product thesis

Evidence:
- `lexitap-docs/01-discovery-strategy/VISION_PROBLEM_STATEMENT.md:22` frames the product around spelling-construction controls.
- `lexitap-docs/01-discovery-strategy/VISION_PROBLEM_STATEMENT.md:32` says LexiTap exercises active spelling recall.
- `lexitap-docs/01-discovery-strategy/VISION_PROBLEM_STATEMENT.md:43` makes spelling-construction active recall part of the pricing/pedagogy thesis.
- `lexitap-docs/01-discovery-strategy/VISION_PROBLEM_STATEMENT.md:56-67` uses `SpellingActiveRecall` and active-spelling failure as gate/kill criteria.
- `lexitap-docs/01-discovery-strategy/GO_TO_MARKET_STRATEGY.md:60-65` recommends spelling-focused ASO, Reddit, and video messaging.
- `lexitap-docs/01-discovery-strategy/GO_TO_MARKET_STRATEGY.md:76` says spelling widgets are verified in Phase 1.
- `lexitap-docs/01-discovery-strategy/BUSINESS_MODEL_CANVAS.md:28`, `35`, `96`, `105`, and `124-126` all depend on spelling/active-recall positioning.
- `lexitap-docs/08-financial-legal/APP_STORE_DISTRIBUTION_STRATEGY.md:78-84` defines ASO and screenshots around spelling and `SpellingActiveRecall`.

Impact:
- Discovery, marketing, ASO, screenshots, success metrics, and product thesis point at a feature that current implementation rules forbid.
- This is more than wording; it affects what is built, tested, and sold.

Recommended fix:
- Do one coordinated “product thesis” patch across strategy, GTM, app-store, and PRD docs.
- Replace active spelling claims with LexiTap’s current differentiator: frictionless recognition practice for global ESL learners, offline-first SRS, content ladder, and no-typing mobile study.

### P0-04: B2B off-store seat-token compliance is overstated

Evidence:
- `lexitap-docs/08-financial-legal/MONETIZATION_COMPLIANCE.md:37` says B2B web portal bulk licenses are fully compliant and legally bypass store IAP fees.
- `lexitap-docs/08-financial-legal/MONETIZATION_COMPLIANCE.md:40-43` relies on Apple 3.1.3(c) and says Google educational distribution is exempt.
- `lexitap-docs/08-financial-legal/APP_STORE_DISTRIBUTION_STRATEGY.md:69` says the approach is fully compliant under Apple 3.1.3(c).
- `lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md:76` says web payments are 100% compliant with store guidelines.

External verification:
- Apple Guideline 3.1.1 says in-app feature/content unlocks must use IAP and apps may not use their own mechanisms such as license keys to unlock content: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), retrieved 2026-05-24.
- Apple Guideline 3.1.3(c) allows enterprise users to access previously purchased content if the app is only sold directly to organizations/groups for employees or students; consumer single-user sales must use IAP: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), retrieved 2026-05-24.
- Google Play says Play-distributed apps requiring payment for in-app features, services, app functionality, digital content, or subscriptions must use Google Play Billing unless specified exceptions apply, and apps may not lead users to other payment methods: [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en), retrieved 2026-05-24.

Impact:
- The docs treat a potentially review-sensitive architecture as settled law.
- The phrase “fully compliant” could cause implementation to skip the very mitigations that App Review may require.
- Mixed B2C IAP plus B2B web licenses in the same consumer app needs careful legal and review positioning.

Recommended fix:
- Downgrade all “fully compliant” and “100% compliant” language to “intended compliance strategy; requires legal/App Review validation.”
- Add a decision record for the chosen B2B entitlement architecture.
- Consider safer alternatives before implementation:
  - B2B seat tokens only for organizations where the app is distributed as an enterprise/classroom companion and no in-app purchase steering exists.
  - Web-purchased subscriptions are also available as IAP in-app, with no in-app steering to web checkout, relying only on permitted access to previously purchased content where applicable.
  - Separate institutional build/product if counsel determines the mixed consumer+B2B unlock model is too risky.

## P1 Important Fixes

### P1-01: Pricing docs simplify Stripe fees as exactly 3%

Evidence:
- `lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md:75` models Stripe as 3% of gross.
- `lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md:90-92` calculates B2B net using exactly 3%.
- `lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md:152` acknowledges Stripe’s 2.9% + $0.30 but leaves the main model as 3%.

External verification:
- Stripe US standard pricing is 2.9% + 30¢ per successful domestic card transaction, with additional fees for manually entered cards, international cards, and currency conversion: [Stripe pricing](https://stripe.com/us/pricing), retrieved 2026-05-24.

Impact:
- The 3% approximation is close for domestic $199+ transactions, but the docs call it “standard Stripe processing fee.”
- International ESL institutional customers may trigger higher effective rates.

Recommended fix:
- Change the model to “3% planning approximation for domestic cards; actual Stripe fee is 2.9% + $0.30 plus possible international/currency fees.”
- Add a sensitivity row for international cards because B2B customers are likely global.

### P1-02: RevenueCat docs use MRR where the current pricing page uses MTR

Evidence:
- `lexitap-docs/05-engineering-process/DEPLOYMENT_RELEASE_RUNBOOK.md:52` says RevenueCat is free up to $2.5k MRR.
- `lexitap-docs/08-financial-legal/THIRD_PARTY_DEPENDENCY_AUDIT.md:32`, `48`, and `92` use `$2.5k MRR`.

External verification:
- RevenueCat’s current pricing page says the free threshold is $2,500 in monthly tracked revenue, then 1% once hitting $2,500 in MTR: [RevenueCat pricing](https://www.revenuecat.com/pricing), retrieved 2026-05-24.

Impact:
- MRR and MTR are not identical. RevenueCat bills on tracked revenue semantics, not only recurring revenue.

Recommended fix:
- Replace `MRR` with `MTR / monthly tracked revenue`.
- Mention that tracked one-time purchases may also count, if applicable to RevenueCat’s current billing definition.

### P1-03: Expo SDK docs are current enough for the repo but stale against latest Expo

Evidence:
- `mobile/package.json` pins Expo `~52.0.0`, React Native `0.76.5`, React `18.3.1`.
- `lexitap-docs/08-financial-legal/THIRD_PARTY_DEPENDENCY_AUDIT.md:56` says `expo (SDK 52)`.

External verification:
- Expo’s current docs list latest SDKs 54, 55, and 56, with SDK 56 targeting React Native 0.85 and React 19.2.3: [Expo SDK reference](https://docs.expo.dev/versions/latest/), retrieved 2026-05-24.

Impact:
- The repo is intentionally or historically pinned to SDK 52, but docs do not distinguish “current repo pin” from “latest available.”
- Store submission timelines can be affected by outdated SDK/native platform support.

Recommended fix:
- Add a short “current repo pin” note to engineering/process docs.
- Add a Phase 5 pre-submission task to run `npx expo-doctor` and evaluate SDK upgrade requirements.

### P1-04: Supabase free-tier claims omit constraints that matter for production

Evidence:
- `lexitap-docs/05-engineering-process/ENVIRONMENT_SETUP.md:111`, `lexitap-docs/05-engineering-process/CI_CD_PIPELINE.md:151`, `lexitap-docs/08-financial-legal/THIRD_PARTY_DEPENDENCY_AUDIT.md:41`, and `lexitap-docs/01-discovery-strategy/BUSINESS_MODEL_CANVAS.md:86` all summarize Supabase as free until roughly 50K users.

External verification:
- Supabase current billing docs list Free Plan quotas including 50,000 monthly active users, 500 MB database size, 5 GB egress, 1 GB storage, 500,000 Edge Function invocations, and project pausing after inactivity: [Supabase billing docs](https://supabase.com/docs/guides/platform/billing-on-supabase), retrieved 2026-05-24.

Impact:
- The 50K MAU claim is broadly correct, but production risk also depends on database size, egress, Edge Function use, and project activity.

Recommended fix:
- Keep the 50K claim but qualify it as auth MAU only.
- Add database/egress/function quotas where cost planning appears.

### P1-05: Apple Sign in with Apple phase is inconsistent across docs

Evidence:
- `lexitap-docs/02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md:77` defers Apple Sign-In to Phase 5.
- `lexitap-docs/02-product-definition/OUT_OF_SCOPE.md:66` says Apple Sign-In MVP inclusion is undecided.
- `lexitap-docs/02-product-definition/ROADMAP.md:66-68` says Sign in with Apple is Phase 3 and explains why.
- `lexitap-docs/08-financial-legal/APP_STORE_DISTRIBUTION_STRATEGY.md:71` also says Phase 3.

External verification:
- Apple Guideline 4.8 says apps using third-party or social login services for primary accounts must also offer an equivalent login service with privacy-preserving features; Apple lists Google Sign-In as an example: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), retrieved 2026-05-24.

Impact:
- Phase planning for auth is ambiguous.
- Phase 5 is too late if Google Sign-In ships earlier and TestFlight/App Review scrutiny begins.

Recommended fix:
- Make Phase 3 Sign in with Apple the canonical plan everywhere if Google Sign-In remains in scope.
- If Apple Sign-In is not desired, remove Google Sign-In from MVP and use first-party email/password only until ready.

### P1-06: Root roadmap says no code exists, but code exists

Evidence:
- `ROADMAP.md:19` says `Code written | None`.
- The repo contains working `content-tool/src` and `mobile/src` implementations, tests, migrations, presentation screens, infrastructure DB queries, and SRS/domain logic.

Impact:
- Root project state is misleading.

Recommended fix:
- Update root roadmap status to reflect that both Track A and Track B scaffolds/code exist.
- Or mark root `ROADMAP.md` as a legacy tracker and point readers to `lexitap-docs/02-product-definition/ROADMAP.md`.

### P1-07: Dependency docs list libraries not currently installed

Evidence:
- `lexitap-docs/04-technical-architecture/TECH_STACK_DECISIONS.md` references TanStack Query and Zustand as chosen state tools.
- `lexitap-docs/08-financial-legal/THIRD_PARTY_DEPENDENCY_AUDIT.md:60-61` audits `@tanstack/react-query v5` and `zustand`.
- `mobile/package.json` does not include `@tanstack/react-query`, `zustand`, `react-native-purchases`, or `expo-apple-authentication`.

Impact:
- Some docs read as implemented dependency audits, but the packages are not yet in the app.

Recommended fix:
- Mark these as planned/Phase 3+ dependencies unless installed.
- Split dependency audit rows into `installed` vs `planned`.

## P2 Cleanup

### P2-01: Budget baseline alternates between ~$144 and ~$194

Evidence:
- `ROADMAP.md:10` says `$194 Year 1 budget`.
- `lexitap-docs/05-engineering-process/CI_CD_PIPELINE.md:146` says Year-1 budget is roughly `$144`.
- `lexitap-docs/08-financial-legal/THIRD_PARTY_DEPENDENCY_AUDIT.md:31-34` explains the discrepancy.

Recommended fix:
- Use `$194 realistic first-year cash outlay` everywhere.
- Keep `$144` only as an explicitly labeled aspirational floor, if useful.

### P2-02: “Open Questions” include resolved decisions

Evidence:
- `lexitap-docs/08-financial-legal/THIRD_PARTY_DEPENDENCY_AUDIT.md:92` is under Open Questions but begins `IAP vendor — resolved`.
- Several open-question sections contain a leaning/default rather than a question.

Recommended fix:
- Move resolved items to Decision Notes.
- Keep Open Questions only for unresolved choices that block future work.

### P2-03: Legal and compliance docs should avoid absolute legal conclusions

Evidence:
- `lexitap-docs/08-financial-legal/MONETIZATION_COMPLIANCE.md:37`, `54`, and similar lines use absolute legal-risk language.
- `lexitap-docs/07-operations-compliance/GDPR_COPPA_COMPLIANCE.md:13` correctly says it is not legal advice.

Recommended fix:
- Apply the same “not legal advice / requires attorney review before launch” stance across financial-legal docs.
- Replace “wipes out legal risk” with “reduces operational compliance burden; confirm with counsel.”

### P2-04: Path naming in root guidance differs from actual code paths

Evidence:
- `AGENTS.md:30` bans `TextInput` under `presentation/screens/quiz/` and `components/assessments/`.
- Actual paths include `mobile/src/presentation/screens/QuizScreen.tsx` and `mobile/src/presentation/components/assessments/`.
- `lexitap-docs/05-engineering-process/AGENTS_CLAUDE.md:148` references `src/screens/quiz/` and `src/components/assessments/`.

Recommended fix:
- Normalize docs to the actual paths under `mobile/src/presentation/...`.
- Keep the rule behavior unchanged.

### P2-05: Some tags/frontmatter still encode stale spelling direction

Evidence:
- `lexitap-docs/02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md:7` tags include `spelling` and `active-recall`.
- Several strategy docs tag or keyword around active recall/spelling.

Recommended fix:
- Update tags after the product-thesis patch so search/indexing does not resurface stale direction.

### P2-06: Docs index counts are stale

Evidence:
- `lexitap-docs/README.md:12` says the canonical layer has 41 documents.
- `lexitap-docs/README.md:20` says Product Definition has 5 documents.
- The current filesystem has 42 non-README docs under `lexitap-docs/`, with 6 Product Definition docs.

Recommended fix:
- Update `lexitap-docs/README.md` to say 42 documents.
- Update the Product Definition row from 5 to 6, or clarify whether one Product Definition document is intentionally excluded from the canonical count.

## Verified OK

- Relative Markdown links are healthy: 55 Markdown files checked after this report was added, 0 broken relative links.
- `lexitap-docs/README.md` accurately describes 8 categories and now has corrected document-count metadata.
- `AGENTS.md` and `CLAUDE.md` match each other and capture the current hard rules.
- TypeScript strictness and `noUncheckedIndexedAccess` are enabled in both `mobile/tsconfig.json` and `content-tool/tsconfig.json`.
- Package scripts support the documented `npm run check` gate in both projects.
- Actual mobile code follows many architecture rules:
  - `expo-sqlite` imports are isolated to `mobile/src/infrastructure/db/database.ts`.
  - Supabase imports are isolated to `mobile/src/infrastructure/sync/`.
  - Quiz presentation uses `MultipleChoice` and `DragDrop`, not `TextInput`.
  - Assessment components include no `TextInput`.
  - DB query modules are named and parameterized.
  - Active-word query functions filter `deleted_at IS NULL`.
  - `quiz_attempts` and `event_log` query modules expose append/insert behavior only.
  - SRS writes carry `scheduler_version`.
  - Streak/civil-date logic exists under `mobile/src/domain/time/`.

## Recommended Patch Set (Completed Scope)

The follow-up patch pass completed these areas in this order:

1. Product thesis correction:
   - `lexitap-docs/02-product-definition/PRODUCT_REQUIREMENTS_DOCUMENT.md`
   - `lexitap-docs/01-discovery-strategy/VISION_PROBLEM_STATEMENT.md`
   - `lexitap-docs/01-discovery-strategy/BUSINESS_MODEL_CANVAS.md`
   - `lexitap-docs/01-discovery-strategy/GO_TO_MARKET_STRATEGY.md`
   - `lexitap-docs/08-financial-legal/APP_STORE_DISTRIBUTION_STRATEGY.md`

2. Roadmap reconciliation:
   - `ROADMAP.md`
   - `lexitap-docs/02-product-definition/ROADMAP.md`, only if any remaining phase wording depends on active spelling.

3. Store and pricing compliance cleanup:
   - `lexitap-docs/08-financial-legal/MONETIZATION_COMPLIANCE.md`
   - `lexitap-docs/08-financial-legal/REVENUE_MODEL_PRICING.md`
   - `lexitap-docs/08-financial-legal/THIRD_PARTY_DEPENDENCY_AUDIT.md`
   - `lexitap-docs/08-financial-legal/APP_STORE_DISTRIBUTION_STRATEGY.md`

4. Engineering/current-state cleanup:
   - `lexitap-docs/05-engineering-process/ENVIRONMENT_SETUP.md`
   - `lexitap-docs/05-engineering-process/CI_CD_PIPELINE.md`
   - `lexitap-docs/05-engineering-process/AGENTS_CLAUDE.md`
   - `lexitap-docs/04-technical-architecture/TECH_STACK_DECISIONS.md`

5. Index and metadata cleanup:
   - `lexitap-docs/README.md`

6. Final hygiene:
   - Re-run the relative-link checker.
   - Re-run targeted `rg` checks for `SpellingActiveRecall`, `parents`, `high schoolers`, `fully compliant`, `$144`, `MRR`, and planned-but-uninstalled dependencies.
   - Run `git diff --check`.

## Sources Checked

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), retrieved 2026-05-24.
- [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en), retrieved 2026-05-24.
- [Supabase billing docs](https://supabase.com/docs/guides/platform/billing-on-supabase), retrieved 2026-05-24.
- [RevenueCat pricing](https://www.revenuecat.com/pricing), retrieved 2026-05-24.
- [Stripe pricing](https://stripe.com/us/pricing), retrieved 2026-05-24.
- [Expo SDK reference](https://docs.expo.dev/versions/latest/), retrieved 2026-05-24.
