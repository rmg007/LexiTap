# Full Codebase Cleanup Plan — Post-Architecture-Review Drift

Date: 2026-05-28
Trigger: ERD pivot applied 2026-05-28 (see `erd.mmd` and memory [[project-architecture-review-2026-05]]). The rest of the repo — mobile code, content-tool, lexitap-docs, root ROADMAP — still describes the pre-pivot architecture and will mislead implementation.
Scope: align every file with the new ERD. After this plan, `lexitap-docs/`, `mobile/`, `content-tool/`, and root planning files all describe the same architecture.

## Guiding Decisions

These are the up-front design calls that govern the rest of the plan. Flag any you want changed before execution.

### D1. Delete premature entitlement code rather than refactor

**Affected:** `application/tier/CheckAccessUseCase.ts` (+test), `application/tier/UnlockTierUseCase.ts`, `domain/user/Entitlement.ts`, `infrastructure/db/repositories/SQLiteEntitlementRepository.ts`, `infrastructure/db/queries/entitlementQueries.ts`.

**Decision:** delete all of it. The Entitlement domain entity, the repository, both use cases, and the queries currently read from a `user_entitlements` table that no longer exists. Per [[project-iap-decision]], RevenueCat is the chosen IAP vendor and "native wiring deferred to Phase 3". Phase 3 will introduce a new `RevenueCatEntitlementService` against a clean port — it should not inherit shape from the local-DB stub.

**Alternative:** keep as scaffolding, rewire to in-memory cache. Rejected — drift risk is real (we just cleaned drift), the stub is small enough to rewrite in Phase 3.

### D2. Delete premature sync code rather than rewrite

**Affected:** `infrastructure/sync/SupabaseSyncService.ts`, `syncMappers.ts`, `syncMappers.test.ts`, `application/user/SyncProgressUseCase.ts` (+test).

**Decision:** delete. The per-table sync mirror is gone; the new `BlobBackupService` (serialize → encrypt → upload user.db) is Phase 3+ work and shares zero implementation with per-table sync. **Keep** `supabaseClient.ts` and `errors.ts` — they will be reused.

### D3. Delete `TeacherCodeRedemption.md` screen spec entirely

**Affected:** `lexitap-docs/03-ux-design/screens/TeacherCodeRedemption.md`, `lexitap-docs/03-ux-design/screens/README.md` (index link).

**Decision:** delete the screen, remove from index. RevenueCat handles promo codes natively if we want them later — that is a different screen with different mechanics. The current spec was written against the deleted `promo_codes` Supabase table.

### D4. Strategy docs (`GO_TO_MARKET_STRATEGY.md`, `BUSINESS_MODEL_CANVAS.md`) get a status banner, not a rewrite

**Decision:** Add a frontmatter banner saying "Teacher referral mechanics referenced in this doc are Phase 3+ aspirational. The teacher/referral/promo subsystem was removed from the v1 schema on 2026-05-28 — see plans/full-cleanup-2026-05-28.md." Do not delete research content. The hours saved are real; the research is reusable if teacher referrals come back.

**Alternative:** full rewrite to remove teacher GTM. Rejected — research has value beyond v1 scope.

### D5. Historical audit plans (`plans/docs-audit-2026-05-24.md`, `plans/documentation-completion-plan-2026-05-26.md`) are NOT updated

**Decision:** leave as-is. They are point-in-time records. Modifying them rewrites history.

## Decisions to confirm before execution

If any of D1–D5 are wrong, stop and tell me. Default is: execute as written.

## Phased Plan

Phases are ordered to never leave the build broken at a phase boundary. After each phase, `mobile/npm run check` and `content-tool/npm run check` should pass.

### Phase 1 — user.db schema & types alignment

Goal: `mobile/src/infrastructure/db/` describes the new ERD.

Files:
- `migrations/001_initial_schema.ts` — drop `user_entitlements` CREATE; drop `user_stats.last_activity_date` column; add `user_stats.onboarding_state TEXT`; add `notification_schedule` CREATE; add `schema_version` CREATE; add CHECK (id = 1) to user_stats; mark scheduler_version requirement.
- `rows.ts` — drop `EntitlementRow`; update `UserStatsRow` (drop `last_activity_date`, add `onboarding_state`); add `NotificationScheduleRow`; add `SchemaVersionRow`.
- `mappers.ts` — drop entitlement mappers; update user_stats mapper; add notification_schedule mapper; add schema_version mapper.
- `mappers.test.ts` — same shape as mappers.ts.
- `queries/statsQueries.ts` — drop `last_activity_date` from SELECT/UPDATE; add `onboarding_state` JSON handling.
- `queries/wordQueries.ts` — verify `deleted_at IS NULL` filter still present; no other changes expected.
- `queries/entitlementQueries.ts` — DELETE FILE (part of D1, but the file removal happens here so migrations stop referencing the dropped table).

Verification: schema TS compiles; mappers tests pass; no remaining import of EntitlementRow.

### Phase 2 — Delete premature entitlement code (D1)

Files to delete:
- `mobile/src/application/tier/CheckAccessUseCase.ts`
- `mobile/src/application/tier/CheckAccessUseCase.test.ts`
- `mobile/src/application/tier/UnlockTierUseCase.ts`
- `mobile/src/application/tier/UnlockTierUseCase.test.ts` (if exists)
- `mobile/src/infrastructure/db/repositories/SQLiteEntitlementRepository.ts`
- `mobile/src/domain/user/Entitlement.ts` (only if no other code imports it)

Files to update:
- `mobile/src/composition/container.ts` — remove all entitlement bindings, remove imports.
- Any barrel/`index.ts` that re-exports the deleted symbols.

Verification: grep for `EntitlementRepository|CheckAccessUseCase|UnlockTierUseCase|SQLiteEntitlementRepository` in mobile/src → 0 results. `tsc` clean.

### Phase 3 — Delete premature sync code (D2)

Files to delete:
- `mobile/src/infrastructure/sync/SupabaseSyncService.ts`
- `mobile/src/infrastructure/sync/syncMappers.ts`
- `mobile/src/infrastructure/sync/syncMappers.test.ts`
- `mobile/src/application/user/SyncProgressUseCase.ts`
- `mobile/src/application/user/SyncProgressUseCase.test.ts`

Files to keep:
- `mobile/src/infrastructure/sync/supabaseClient.ts` — Supabase client setup, reused for auth and blob backup.
- `mobile/src/infrastructure/sync/errors.ts` — generic Supabase error shapes.
- `mobile/src/infrastructure/sync/index.ts` — update barrel exports.

Files to update:
- `mobile/src/composition/container.ts` — remove sync bindings.
- Any screen/hook that imports `SyncProgressUseCase` (likely Settings or Progress screen wiring — grep first).

Verification: grep for `SupabaseSyncService|SyncProgressUseCase|syncMappers` in mobile/src → 0 results. `tsc` clean.

### Phase 4 — IAP stub alignment

Files:
- `mobile/src/infrastructure/iap/IapService.ts` — remove any writes/reads to `user_entitlements`. Port stays as-is for Phase 3 RevenueCat adapter.
- `mobile/src/infrastructure/iap/StubIapService.ts` — same.

Verification: `IapService` no longer touches the DB.

### Phase 5 — content-tool cleanup

Files (all trivial edits):
- `content-tool/src/schema/types.ts` — drop `price_usd: number | null` field.
- `content-tool/src/schema/ddl.ts` — drop `price_usd REAL,` column.
- `content-tool/src/lib/config.ts` — drop `price_usd` from `TierConfig`.
- `content-tool/lexitap.config.json` — drop `price_usd` from all 3 tier entries.
- `content-tool/src/commands/export.ts` — drop `price_usd` from `tierConfigToRow` and INSERT_TIER binding.
- `content-tool/src/commands/export.test.ts` — drop `price_usd` from test fixtures.
- `content-tool/src/commands/validate.test.ts` — drop `price_usd` from test fixtures.

Verification: `content-tool/npm run check` passes. `npm run build` or whatever produces `words.db` runs clean and the resulting schema has no `price_usd` column.

### Phase 6 — Documentation

Done in sub-phases to keep diffs reviewable.

#### 6a. DATABASE_SCHEMA.md major rewrite

`lexitap-docs/04-technical-architecture/DATABASE_SCHEMA.md` (431 lines). The single most-impacted doc. Strategy: rewrite to mirror the new ERD section-by-section. Delete sections for: user_entitlements, user_progress_sync, user_entitlements_sync, user_stats_sync, teachers, referrals, promo_codes. Add sections for: notification_schedule, schema_version, user_db_backups (Supabase Storage). Update content_tiers (no price_usd) and user_stats (no last_activity_date, add onboarding_state) sections. Update ToC.

#### 6b. Other architecture docs

- `SYSTEM_ARCHITECTURE.md` (220 lines) — replace "per-table sync" descriptions with "encrypted blob backup"; note RevenueCat owns entitlements.
- `SECURITY_MODEL.md` (142 lines) — document blob encryption + Storage access controls; remove per-table sync security claims.
- `TECH_STACK_DECISIONS.md` (133 lines) — add decision record for "RevenueCat over self-rolled receipt validation" and "blob backup over per-table sync."
- `INFRASTRUCTURE_DIAGRAM.md` (135 lines) — redraw flow: device ↔ Supabase Auth, device → Supabase Storage (blob), device ↔ RevenueCat.

#### 6c. Screen specs

- `screens/TeacherCodeRedemption.md` — DELETE (per D3).
- `screens/README.md` — remove TeacherCodeRedemption row.
- `screens/Paywall.md` — rewrite entitlement flow: RevenueCat SDK, no local user_entitlements writes.
- `screens/Progress.md` — replace "sync indicator" with "backup status" where present.
- `screens/Settings.md` — replace per-table sync settings with backup-status section (upload time, last successful backup, manual trigger).

#### 6d. UX flows

- `USER_FLOWS.md` (224 lines) — purchase flow uses RevenueCat; remove teacher redemption flow; replace sync flow with backup flow.

#### 6e. Compliance & ops

- `lexitap-docs/08-financial-legal/MONETIZATION_COMPLIANCE.md` — remove teacher/referral B2B claims from Phase 1 scope, mark as Phase 3+.
- `lexitap-docs/07-operations-compliance/GDPR_COPPA_COMPLIANCE.md` — update data-storage description: encrypted blob backup, not per-row sync; remove teacher data references.
- `lexitap-docs/07-operations-compliance/PRIVACY_POLICY_TERMS_OF_SERVICE.md` — same as GDPR.
- `lexitap-docs/07-operations-compliance/SUPPORT_ESCALATION_RUNBOOK.md` — update sync troubleshooting → backup troubleshooting; entitlement issues → RevenueCat dashboard.

#### 6f. Strategy docs (status banner only, per D4)

Add a banner block at the top of each:
- `lexitap-docs/01-discovery-strategy/GO_TO_MARKET_STRATEGY.md`
- `lexitap-docs/01-discovery-strategy/BUSINESS_MODEL_CANVAS.md`

Banner content: "STATUS 2026-05-28: Teacher referral and promo code mechanics described below are Phase 3+ aspirational. The teacher/referral/promo subsystem was removed from the v1 schema during the 2026-05 architecture review. v1 ships with App Store IAP via RevenueCat only. See plans/full-cleanup-2026-05-28.md."

#### 6g. Content pipeline

- `lexitap-docs/06-content-data/CONTENT_PIPELINE_ARCHITECTURE.md` — remove `price_usd` from schema examples; add note that runtime pricing is RevenueCat-sourced.

#### 6h. Product definition

- `lexitap-docs/02-product-definition/SRS_FORGIVENESS_MECHANICS.md` — verify freeze-field references are consistent with `user_stats` (which still has `freeze_count`, `freezes_granted_total`); no removal expected, but check for any sync-mirror language.
- `lexitap-docs/02-product-definition/ROADMAP.md` (if exists separately from root) — update phase scope.

#### 6i. Plans + ROADMAP

- `ROADMAP.md` (root, 211 lines) — remove "B2B Cram School licensing + non-cash teacher referrals as primary GTM"; replace with "v1 GTM TBD — teacher referrals deferred to Phase 3+." Adjust phase milestone tables to remove per-table sync deliverables; add blob backup as Phase 3 deliverable.
- `plans/screens-improvement-plan.md` — remove TeacherCodeRedemption references; update Paywall references.

### Phase 7 — Verification sweep

Programmatic checks:
1. `mobile/npm run check` — passes (lint + typecheck + test).
2. `content-tool/npm run check` — passes.
3. Markdown link check: `find lexitap-docs/ -name "*.md" -exec grep -l "TeacherCodeRedemption" {} \;` → empty.
4. Stale-string grep across repo (excluding plans/ and memory/):
   - `teachers` (in non-product context), `referrals`, `promo_codes`, `user_progress_sync`, `user_entitlements_sync`, `user_stats_sync`, `user_entitlements`, `price_usd`, `last_activity_date` (only the epoch column variant, not as a general concept), `validation_status`, `validated_at`
   - Each remaining hit must be either historical (audit plan) or in a code comment that explains why it was removed.
5. Confirm new tables appear in DATABASE_SCHEMA.md: `notification_schedule`, `schema_version`, `user_db_backups`.

## Risk & Rollback

- **All code work is local file edits and deletions.** No git history rewriting. No package install. No DB migration runs against real user data — `user.db` is dev-only; migration is in source only.
- **Rollback for code:** `git restore` any phase that breaks the build before moving forward.
- **Rollback for docs:** doc rewrites are atomic per file; `git restore <file>` for any individual revert.
- **One pre-existing risk** worth naming: there is no migration runner installed yet. The schema change in Phase 1 is a source-level change. The first user.db created from this code is the new schema. Any existing developer-machine `user.db` from before this change will break on launch. Mitigation: developers wipe their local `user.db` (Expo app data clear) after pulling Phase 1.

## Effort Estimate

Realistic focused-hours range, assuming deletion approach (D1, D2) is approved:

- **Mobile code (Phases 1–4):** 4–6 hours. Mostly deletion + small schema edits. The big files (`mappers.ts`, `migrations/001_initial_schema.ts`) need rewriting but are well-scoped.
- **content-tool (Phase 5):** 30–45 minutes. All trivial edits.
- **Docs (Phase 6):** 12–18 hours. DATABASE_SCHEMA.md alone is 3–5 hours. Most other docs are 30–60 minutes each.
- **Verification (Phase 7):** 1 hour.
- **Total:** ~18–25 focused hours.

Across one or more sessions. Phases 1–5 (all code) can run in one focused session; Phase 6 (docs) is best split across at least two sessions to keep diffs reviewable.

## Out of Scope

- Installing a migration runner (drizzle-orm or custom). Tracked in [[project-architecture-review-2026-05]] memory. Must happen before public v1 release but is a separate workstream.
- Implementing the actual blob backup service. Phase 3+ work.
- Implementing the actual RevenueCat adapter. Phase 3 work per [[project-iap-decision]].
- Writing the `onboarding_state` shape — defined as JSON; specific schema deferred to onboarding screen work.
- Writing the `notification_schedule` notification scheduling logic — only the table exists in this plan.

## Definition of Done

- `mobile/npm run check` and `content-tool/npm run check` both pass.
- No file under `mobile/src/`, `content-tool/src/`, or `lexitap-docs/` references the 6 deleted tables or `price_usd` or `last_activity_date` (epoch) as current truth.
- `lexitap-docs/04-technical-architecture/DATABASE_SCHEMA.md` mirrors `plans/erd.mmd`.
- `ROADMAP.md` accurately reflects v1 scope without teacher referrals as primary GTM.
- All internal markdown links resolve.
