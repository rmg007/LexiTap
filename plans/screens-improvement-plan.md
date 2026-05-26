# Plan: UX and Screen Documentation Expansion

**Date:** May 26, 2026  
**Status:** Planned (v3 — Full Cross-Document Deep Dive)  
**Track:** Track B (UX & Documentation only)  
**Constraint Invariant:** **Strictly documentation-only.** Do not implement any React Native or SQLite code in `mobile/` or `content-tool/` during the execution of this plan.

---

## 1. Goal

Expand and harden the `lexitap-docs/03-ux-design/screens/` layer so that every screen reachable from the 8 core user flows is fully AI-buildable — meaning a coding agent can generate a correct, production-grade implementation from the spec alone, without referencing any other file.

This requires two classes of work:

1. **Retrofitting existing screen specs** with depth they currently lack based on cross-referencing the full canonical doc set (DATABASE_SCHEMA, SRS_FORGIVENESS_MECHANICS, ACCESSIBILITY_REQUIREMENTS, ONBOARDING_FLOW_SPEC, API_CONTRACT, DESIGN_SYSTEM).

2. **Drafting 5 missing screen specs** that are referenced by flows but have no spec file yet.

---

## 2. Cross-Document Audit Findings

After reading every file across all 8 documentation categories, the following gaps and inconsistencies were identified between existing screen specs and their source-of-truth documents.

### 2.1 What Existing Screens Are Missing

| Screen | Gap | Source Doc |
|---|---|---|
| `Home.md` | Skeletal loading layout not specified; streak chip states (`active/at-risk/frozen`) show color but the a11y doc says each needs icon + text triple-channel. The `frozen` state uses a snowflake glyph but the Design System has no snowflake token defined — needs resolution. | `ACCESSIBILITY_REQUIREMENTS.md §Color-Independent Feedback`, `DESIGN_SYSTEM.md` |
| `Home.md` | `getWordsDueForReview` passes a daily cap but the FORGIVENESS constants (`BASE_DAILY_CAP=40`, `CATCH_UP_BUDGET=20`, `HARD_SESSION_CEILING=200`) are not cited. AI builder won't know the real numbers. | `SRS_FORGIVENESS_MECHANICS.md §Mechanic 1` |
| `Progress.md` | Weekly show-up bar: the spec says "7-day show-up (IANA-tz)" but does not define the source query. The `event_log` table has `event_type='session_completed'` but the query needs to be cross-DB (words.db ATTACH user.db) and filter by local civil date, not epoch. | `DATABASE_SCHEMA.md §event_log`, `SRS_FORGIVENESS_MECHANICS.md §Timezone handling` |
| `Progress.md` | No skeleton state specified for the per-tier mastery ring, which is a non-trivial JOIN across ATTACH databases and will have non-zero load time. | `DATABASE_SCHEMA.md §Cross-DB Queries` |
| `QuizFeedbackStates.md` | Section 12 notes affirm copy "rotates from a small bank" — this is unresolved. The spec needs to name the copy bank (even if the final list is owned by content) so an AI builder doesn't produce a single hardcoded string. | `DESIGN_SYSTEM.md`, `SRS_FORGIVENESS_MECHANICS.md §Design Principles §1` |
| `QuizFeedbackStates.md` | The mastery-delta mechanics (`correct → mastery +1`, `incorrect → mastery -1, re-queue sooner`) are mentioned but the SRS write path is not shown. Specifically: which use case? What is written atomically? The `quiz_attempts` append-only invariant and `scheduler_version` tag requirement are stated in the DB schema but not reflected back into this spec's §5 Data Requirements. | `DATABASE_SCHEMA.md §quiz_attempts`, `SRS_FORGIVENESS_MECHANICS.md §Implementation Interface` |
| `QuizDragDrop.md` | Tap-to-place fallback is described in §9 but not in the §7 Interactions table, and the ARIA announce strings are inconsistent with what `ACCESSIBILITY_REQUIREMENTS.md §Screen Reader Support` specifies ("placed candid in honest, direct" vs "candid, placed in: honest, direct"). Needs normalization. | `ACCESSIBILITY_REQUIREMENTS.md §DragDrop` |
| `QuizMultipleChoice.md` | Audio autoplay is an open question. `ACCESSIBILITY_REQUIREMENTS.md §Audio` explicitly says "no audio autoplay that could surprise a screen-reader user; playback is user-initiated." This resolves the open question — it should be closed, not left open. | `ACCESSIBILITY_REQUIREMENTS.md §Audio and Captions` |
| `SessionComplete.md` | The `target_file` is TBD and the code status is `todo` but the spec references `QuizSession` summary data. The spec doesn't specify the trigger for the `medium` haptic — it should fire once on entry when streak increments, not on the Done button. The existing haptic row is ambiguous. | `Home.md §7 Interactions` |
| `LearnCard.md` | No SRS write on the learn card itself (correct per spec), but the spec doesn't document that the transition to `LearnQuickCheck` is the atomic SRS seed boundary. An AI builder may insert the SRS write in the wrong place. The boundary should be explicit. | `ONBOARDING_FLOW_SPEC.md §Stage 6`, `DATABASE_SCHEMA.md §user_progress` |
| `LearnQuickCheck.md` (not yet read) | Unknown — need to read to assess. |  |
| `ForgivenessSheet.md` | References "soft catch-up redistributes overdue items across upcoming days" but the reanchorBacklog algorithm from SRS_FORGIVENESS_MECHANICS is not linked. An AI builder won't know the exact redistribution rule. | `SRS_FORGIVENESS_MECHANICS.md §Mechanic 2` |
| `ForgivenessSheet.md` | The `Remaining due count` is listed as a data requirement but noted as "NOT shown as guilt." This creates an implementation ambiguity — the builder needs to know what this number is *used for* (soft catch-up trigger) and *why it is never displayed*. | `SRS_FORGIVENESS_MECHANICS.md §Anti-patterns` |
| `Paywall.md` | `target_file: TBD` and `code status: todo`. The `UnlockTierUseCase` is referenced but the entitlement write path — local-first, then sync to Supabase via `user_entitlements_sync` — is not spelled out. An AI builder following only this spec won't know to write SQLite first, then sync. | `DATABASE_SCHEMA.md §user_entitlements`, `API_CONTRACT.md §Sync: Push` |
| `Paywall.md` | The RevenueCat / `StubIapService` delegation pattern is named but the `application/` boundary (PaywallReviewer) is not defined in any spec. This boundary decision exists only as a comment. Needs a clear note that the IAP adapter lives in `infrastructure/iap/` per hexagonal rules. | `SYSTEM_ARCHITECTURE.md` (inferred from AGENTS.md) |
| `SigninAccount.md` | Merge semantics on sign-in with existing local data are defined as "last-write-wins per record; SRS events merge append-only." But the specific conflict resolution for `freeze_count` (keep lower) and `current_streak` (keep higher) from `SRS_FORGIVENESS_MECHANICS.md §Edge Cases` is not referenced here. These rules exist nowhere in the screen specs. | `SRS_FORGIVENESS_MECHANICS.md §Edge Cases §Two devices` |
| `OnboardingAdaptiveYesNo.md` (not yet read) | Known gap: pseudo-word presentation (they must not be visually flagged). | `ONBOARDING_FLOW_SPEC.md §Stage 3` |
| `TeacherCodeRedemption.md` | §6 states "No account yet → store provisionally on device; bind on account creation/sign-in." But no detail on *how* this provisional storage works. Is it AsyncStorage? A `pending_codes` table? The `API_CONTRACT.md §RPC: Teacher Advocate Redemption` requires a `source_event_id` (UNIQUE) — this provisional binding strategy must honor that deduplication. | `API_CONTRACT.md §RPC: Teacher Advocate Redemption`, `DATABASE_SCHEMA.md §event_log` |

### 2.2 Open Questions Resolved by Cross-Document Reading

These open questions in existing screen specs are **already answered** in other canonical docs and should be closed (not left open) in the retrofitted specs:

| Screen | Open Question | Resolution Source |
|---|---|---|
| `QuizMultipleChoice.md §12` | "Audio autoplay-on-reveal vs strictly tap-to-play" | RESOLVED: tap-to-play only. `ACCESSIBILITY_REQUIREMENTS.md §Audio`: "No audio autoplay that could surprise a screen-reader user; playback is user-initiated." |
| `Progress.md §12` | "Weekly bar semantics: rolling 7 days vs calendar week" | NEEDS DECISION: SRS_FORGIVENESS uses `civilDayDiff` (YYYYMMDD), which implies calendar-anchored. User_stats has `last_activity_local_date` (YYYYMMDD), so the show-up bar should use local calendar days — rolling 7 means the most recent 7 distinct YYYYMMDD dates the event_log has a `session_completed` entry. |
| `Settings.md §12` | "Whether 'Manage subscription' deep-links to store-native management UI" | RESOLVED by platform rules: Apple requires subscription management link for IAP apps. Will be a URL open to `https://apps.apple.com/account/subscriptions`. |
| `SigninAccount.md §12` | "Which auth providers ship at MVP (Apple required on iOS if any social login is present)" | PARTIALLY RESOLVED: `API_CONTRACT.md` lists email + Google. Apple Sign-in is required by App Store policy if any social login is offered on iOS. Spec must include Apple. |

### 2.3 Missing Screens — Flow Coverage Map

Cross-referencing `USER_FLOWS.md` against the `screens/README.md` inventory:

| Flow | Expected Screen | Status |
|---|---|---|
| Flow 1 (Onboarding) | `OnboardingSplash.md` | spec exists ✓ |
| Flow 1 | `OnboardingValue.md` | spec exists ✓ |
| Flow 1 | `OnboardingSelfSegment.md` | spec exists (partial) ✓ |
| Flow 1 | `OnboardingAdaptiveYesNo.md` | spec exists (partial) ✓ |
| Flow 1 | `OnboardingKnowledgeMapReveal.md` | spec exists ✓ |
| Flow 1 | `OnboardingAccountCreation.md` | spec exists ✓ |
| Flow 2 (Review) | `Home.md` → Quiz → `SessionComplete.md` | specs exist ✓ |
| Flow 2 | `QuizFeedbackStates.md` | spec exists ✓ |
| Flow 3 (Learn) | `LearnCard.md` | spec exists ✓ |
| Flow 3 | `LearnQuickCheck.md` | spec exists ✓ |
| Flow 4 (Cap) | `ForgivenessSheet.md` | spec exists ✓ |
| Flow 5 (Paywall) | `Paywall.md` | spec exists ✓ |
| Flow 6 (Teacher Code) | `TeacherCodeRedemption.md` | spec exists ✓ |
| Flow 7 (Sync) | `SigninAccount.md` | spec exists ✓ |
| Flow 8 (Streak) | Streak state on `Home.md` | covered inline ✓ |
| **Not in a flow** | Word Detail Browser | **MISSING** — no spec, no flow |
| **Not in a flow** | Teacher Dashboard (portal, B2B) | **MISSING** — no spec, no flow (Supabase portal, not in-app?) |
| **Not in a flow** | Content Error Reporter | **MISSING** — no spec |
| **Not in a flow** | Sync Conflict Overlay | **MISSING** — but merge is silent per API_CONTRACT (last-write-wins); a visible overlay may be a product decision, not a firm requirement |
| **Not in a flow** | Daily Goal Configurator | **MISSING** — but the Settings screen has a `Daily reminder` toggle; the configurator may be this toggle's destination or inline |

**Critical finding:** Every screen required by the 8 defined user flows already has a spec. The 5 "missing" screens are **future/optional** additions beyond the current MVP flow set. The plan should clarify this and scope them appropriately.

---

## 3. Revised Understanding of the 5 New Screens

Based on deep document analysis, the 5 new screens must be re-scoped to accurately reflect the architecture:

### A. Word Detail Browser (`WordDetailBrowser.md`)
- **Status:** Not in any defined user flow. No `BrowseWordsUseCase` exists in the codebase yet.
- **Decision needed:** Is this an MVP screen or a post-launch content browser? It would slot between Progress and the existing tier rows. If added, it surfaces `words.db` content with `user_progress` overlays via the ATTACH query.
- **Correct query (active filter only):**
  ```sql
  SELECT w.id, w.word, w.definition, w.cefr_level, p.mastery_level, p.next_review_date
  FROM words w
  LEFT JOIN userdb.user_progress p ON w.id = p.word_id
  WHERE w.tier_id = ?
    AND w.deleted_at IS NULL
    AND (? IS NULL OR w.word > ?)  -- keyset anchor for pagination
  ORDER BY w.word ASC
  LIMIT 50;
  ```
- **Note on "muting":** A word cannot be "muted" from the `words.db` content DB (it's read-only). Muting would require a `user_muted_words` table in `user.db` — a new schema addition. This is a significant architectural decision, not a simple UI call.

### B. Teacher Dashboard (`TeacherDashboard.md`)
- **Status:** The teacher-side advocate program is tracked in Supabase only (`teachers`, `referrals` tables). There is **no in-app teacher dashboard** defined anywhere in the docs. This would be a web portal (outside the mobile app), not a React Native screen.
- **Recommendation:** Rename this to `TeacherPortal` and scope it as a **future web UI** spec outside `mobile/`, or defer entirely. Including it in the mobile screen docs creates false scope.

### C. Content Error Reporter (`ContentErrorReporter.md`)
- **Status:** No `content_error_reported` event exists in the `ANALYTICS_PLAN.md` event taxonomy. The `event_log` pattern is valid (append-only, synced on reconnect), but the Supabase sync path for this event type is undefined. 
- **Correct pattern:** Write to `event_log` with `event_type = 'content_error_reported'` and `payload = { word_id, issue_type, note }`. Flush to a Supabase `content_errors` table (to be defined) on next sync. This requires a new Supabase table not in the current schema.
- **Scope:** Valid but requires a schema addendum note in the spec.

### D. Sync Conflict Overlay (`SyncConflictOverlay.md`)
- **Status:** `API_CONTRACT.md` defines sync as **silent background, last-write-wins, no user intervention**. The `SRS_FORGIVENESS_MECHANICS.md §Edge Cases` defines the conflict resolution (keep lower `freeze_count`, keep higher `current_streak`) as automatic logic inside `SyncProgressUseCase`. There is no UX trigger defined for a user-visible conflict overlay.
- **Recommendation:** This should NOT be a modal screen. It should be documented as a non-visible **sync merge policy** card within `SigninAccount.md` or as an addendum to `SRS_FORGIVENESS_MECHANICS.md`. Creating a separate screen spec creates a false expectation of a UI that contradicts the architecture.

### E. Daily Goal Configurator (`DailyGoalConfigurator.md`)
- **Status:** The `Settings.md` spec already includes the `Daily reminder` toggle (§3 Layout, ref D). The existing Settings spec implies this is an inline toggle, not a separate screen.
- **Recommendation:** This is a **settings-screen detail expansion**, not a new screen. The correct deliverable is a retrofit to `Settings.md` adding a sub-sheet spec for the time-picker that appears when the toggle is turned on. Expo's local notification scheduling is the correct implementation pattern.

---

## 4. Corrected Scope of Work

### Phase A: Retrofit Existing Screen Docs (8 files)

These retrofits inject missing detail discovered by cross-document analysis. Each is focused and minimal — add what's missing, don't rewrite what's good.

1. **`Home.md`**
   - Add forgiveness constants to §5 Data Requirements: `BASE_DAILY_CAP=40`, `CATCH_UP_BUDGET=20`, effective cap formula.
   - Add skeleton loading layout (ASCII) and §6 Loading state detail: which regions show skeletons vs hide entirely.
   - Clarify the `frozen` streak chip: the snowflake glyph is described but the Design System has no snowflake token — spec must reference `text.secondary` + a snowflake character, not a token that doesn't exist.
   - Close Home's §12 open questions where resolved.

2. **`Progress.md`**
   - Add the cross-DB query for 7-day show-up bar (reading `event_log` session_completed events filtered to last 7 local civil dates using `YYYYMMDD` arithmetic).
   - Add skeleton placeholders for the mastery ring (needed because the ring is driven by a non-trivial ATTACH query).
   - Resolve "rolling 7 days vs calendar week" to: rolling 7 most-recent calendar days in the user's IANA timezone.

3. **`QuizFeedbackStates.md`**
   - Add the full SRS write path to §5 Data Requirements: `AnswerQuestionUseCase` → `quiz_attempts` INSERT (append-only) + `user_progress` UPDATE (mastery ±1 + next_review_date) tagged with `scheduler_version = 'v1-fixed'`, all in one transaction.
   - Define the affirm copy bank (4–6 variants) inline in §8 Copy so the open question is resolved.
   - Add micro-interaction timing table: reveal delay after Check tap (0ms — immediate), haptic on correct fires concurrently with reveal, no haptic on incorrect.

4. **`QuizDragDrop.md`**
   - Normalize tap-to-place announce strings to match `ACCESSIBILITY_REQUIREMENTS.md` exactly.
   - Add tap-to-place fallback as an explicit row in §7 Interactions.
   - Close audio autoplay open question (N/A — DragDrop has no audio).

5. **`QuizMultipleChoice.md`**
   - Close the audio autoplay open question: **tap-to-play only** (per `ACCESSIBILITY_REQUIREMENTS.md §Audio`).
   - Add note: audio glyph label must read "Play pronunciation of {word}" not just "Play pronunciation" (per `ACCESSIBILITY_REQUIREMENTS.md §Audio`).

6. **`ForgivenessSheet.md`**
   - Link to `SRS_FORGIVENESS_MECHANICS.md §Mechanic 2` for the exact reanchorBacklog algorithm.
   - Clarify "Remaining due count" in §5 is an internal computation input to `reanchorBacklog`, never rendered.
   - Specify: "Stop here" triggers `reanchorBacklog(overdueWords, nowMs, tz)` via the application layer; this is the only time forgiveness writes `next_review_date`.

7. **`Paywall.md`**
   - Clarify the entitlement write path in §5: `UnlockTierUseCase` → (1) INSERT `user_entitlements` in `user.db` (local SQLite, source of truth), (2) PUSH to `user_entitlements_sync` in Supabase. Step 1 must complete before content unlocks.
   - Add hexagonal boundary note: IAP adapter lives in `infrastructure/iap/`; paywall business logic (which tiers to offer, whether teacher trial is active) lives in `application/entitlements/PaywallReviewUseCase`.
   - Resolve "Final benefit bullets per tier" open question as: owned by content/marketing; spec leaves a placeholder table.

8. **`SigninAccount.md`**
   - Add the conservative merge rules from `SRS_FORGIVENESS_MECHANICS.md §Edge Cases`: keep lower `freeze_count`, keep higher `current_streak`, union-merge `quiz_attempts`.
   - Resolve auth providers question: Apple Sign-in + Google + Email at MVP (Apple required by App Store policy when any social login is offered on iOS).
   - Resolve email sign-in question: magic-link preferred (no password stored on device, aligns with secrets management philosophy).

### Phase B: Draft 3 New Screen Specs (corrected scope)

After architectural analysis, the original 5 proposed screens are reduced to 3 that are valid in-app mobile screens:

1. **`WordDetailBrowser.md`** (new) — In-tier word list with mastery overlays; keyset pagination; read-only from words.db + user.db ATTACH. No mute/archive (requires schema work outside doc scope; flag as a future open question). Priority: P2.

2. **`ContentErrorReporter.md`** (new) — Bottom-sheet overlay accessible from any quiz question via a long-press or `...` menu. Writes `event_log` append-only. Requires a schema addendum note (new Supabase `content_errors` table). Priority: P2.

3. **`Settings.md` DailyReminderSheet sub-spec** (retrofit extension) — Not a new file. An addendum to `Settings.md` that specifies the time-picker bottom sheet shown when the Daily reminder toggle is turned on. Uses Expo local notifications; time stored in AsyncStorage. Priority: P2.

**Deferred (with rationale in plan):**
- `TeacherDashboard.md` → Deferred; is a web portal, not a mobile screen.
- `SyncConflictOverlay.md` → Deferred; merge is silent by architecture; no UI trigger defined.

### Phase C: Index and Link Integrity Updates

1. Update `lexitap-docs/03-ux-design/screens/README.md` inventory table:
   - Add `WordDetailBrowser.md` with status `draft`
   - Add `ContentErrorReporter.md` with status `draft`
   - Update existing statuses for any files moved from `todo` to `spec` (none in this pass — code status is not changed by docs)

2. Ensure all new cross-references in retrofitted specs use relative paths consistent with existing link conventions.

---

## 5. Screen-by-Screen Technical Contracts (New Screens)

### WordDetailBrowser.md — Data Contract

```sql
-- Primary query: paginated word list with progress overlay
-- Runs against words.db (main) with user.db ATTACHed
SELECT
  w.id, w.word, w.definition, w.cefr_level, w.difficulty,
  w.word_type, w.audio_path,
  COALESCE(p.mastery_level, 0)   AS mastery_level,
  p.next_review_date
FROM words w
LEFT JOIN userdb.user_progress p ON w.id = p.word_id
WHERE
  w.tier_id = ?
  AND w.deleted_at IS NULL
  AND (? IS NULL OR w.word > ?)   -- keyset anchor; NULL on first page
ORDER BY w.word ASC
LIMIT 50;
```

- **Use case boundary:** `BrowseWordListUseCase` in `application/vocabulary/`; infra query in `infrastructure/db/queries/wordQueries.ts`.
- **Sort options:** Alphabetical (default), by mastery level (ascending = most fragile first), by next review date.
- **Search:** Client-side prefix filter on the loaded page (not a new DB query per keystroke), with a full-text fallback for global search using `LIKE w.word || '%'` on the full tier set.

### ContentErrorReporter.md — Data Contract

```sql
-- Event log write (append-only, in-transaction with any active session)
INSERT INTO event_log (event_type, payload, occurred_at)
VALUES (
  'content_error_reported',
  json_object(
    'word_id', ?,
    'issue_type', ?,   -- 'wrong_definition' | 'wrong_example' | 'wrong_audio' | 'other'
    'note', ?          -- nullable, max 200 chars (constrained picker, not free text)
  ),
  ?                    -- Date.now()
);
```

- **Supabase destination:** A new `content_errors` table (to be added to the schema); flushed on next sync.
- **Issue types:** Selection-based (picker, not free text) to honor the no-typing philosophy.
- **Offline:** Works fully offline; event is queued in `event_log` and flushed when `sync_completed`.
- **No confirmation screen needed:** A toast ("Thanks — we'll review it") is sufficient.

### Settings DailyReminderSheet — Data Contract

- **Storage:** `AsyncStorage.setItem('notifications.dailyReminderTime', JSON.stringify({ hour, minute }))` — no DB write needed.
- **Scheduling:** `Notifications.scheduleNotificationAsync` with `{ trigger: { hour, minute, repeats: true } }` using Expo local notifications.
- **Cancel:** Toggle off calls `Notifications.cancelAllScheduledNotificationsAsync()`.
- **Privacy:** No network call. Fully local. No analytics event emitted for reminder preference (honor privacy promise).
- **Text:** Single soft reminder only. Copy: `title: "LexiTap"`, `body: "Your review words are waiting — just 2 minutes."` No streak-pressure copy.

---

## 6. Acceptance Criteria for This Plan

When complete, the following must be true:

- [ ] All 8 retrofitted screen specs have closed all open questions that are resolved by cross-document reading.
- [ ] All 8 retrofitted screen specs reference specific constants, query signatures, and use case names consistent with `DATABASE_SCHEMA.md`, `SRS_FORGIVENESS_MECHANICS.md`, and `SYSTEM_ARCHITECTURE.md`.
- [ ] `WordDetailBrowser.md` is drafted with the correct ATTACH query, keyset pagination, mastery overlay, and open question about mute/archive.
- [ ] `ContentErrorReporter.md` is drafted with the correct `event_log` append-only pattern and schema addendum note.
- [ ] `Settings.md` is extended with the DailyReminderSheet sub-spec (Expo local notifications, AsyncStorage, no network).
- [ ] `screens/README.md` inventory is updated with the new screens at `draft` status.
- [ ] No `TextInput` is introduced or implied in any quiz-path screen spec.
- [ ] All new specs follow the 13-section template (Frontmatter through Open Questions).
- [ ] All specs are dark-mode-first and reference only `DESIGN_SYSTEM.md` token names, never raw hex values.
- [ ] Link integrity: all relative paths in new and modified files resolve correctly.
- [ ] `npm run check` passes in both `content-tool/` and `mobile/` (documentation changes only — no code touched).

---

## 7. Execution Order

1. Read `LearnQuickCheck.md` and the remaining onboarding screens to assess if they need retrofits.
2. Execute Phase A retrofits in dependency order (leaf specs first): `QuizMultipleChoice.md` → `QuizDragDrop.md` → `QuizFeedbackStates.md` → `ForgivenessSheet.md` → `LearnCard.md` → `Paywall.md` → `SigninAccount.md` → `Home.md` → `Progress.md`.
3. Draft Phase B new screens: `WordDetailBrowser.md` → `ContentErrorReporter.md` → `Settings.md` DailyReminderSheet extension.
4. Update `README.md` inventory and verify all links.
5. Verify `npm run check` passes.
