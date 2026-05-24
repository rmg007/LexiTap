# AGENTS - Mobile App Conventions

---
title: AGENTS - Mobile App Conventions
category: agent-docs
status: active
phase: 1
priority: P0
updated: 2026-05-22
load_order: 3
tags: [agents, conventions, mobile, react-native, typescript, testing, database, srs, offline, adversarial-review, paywall]
---

> Load order: 3 of 14. Load after SESSION_STATE.md. Read this file before every coding task.

---

## Stack

- **Language:** TypeScript 5.x (strict mode enabled)
- **Framework:** React Native 0.73+ via Expo SDK 50 (managed workflow)
- **Package manager:** npm (Expo default)
- **Runtime:** Hermes JS engine

---

## Style

- **Formatter:** `prettier --write`
- **Linter:** `eslint --fix`
- **Type checker:** `tsc --noEmit`
- **Run before commit:** `npm run check`
- **Imports:** Absolute via `@/` prefix

---

## Banned

**Critical - No text input in quiz flows:**

- `TextInput` forbidden in `src/screens/quiz/` and `src/components/assessments/`

**Standard bans:**

- `any` type → use `unknown` + type guards
- `console.log` outside tests → use `src/lib/logger.ts`
- Network requests in quiz logic → app must work offline
- `react-native-async-storage` for structured data → use `expo-sqlite`
- Default exports → always named exports
- `lodash` → use native ES2023 methods

---

## Preferred

- **Testing:** Jest (Expo default) + `@testing-library/react-native`
- **Data persistence:** SQLite via `expo-sqlite` (local, offline-first)
- **Cloud sync:** Supabase (auth + progress backup)
- **State management:** TanStack Query v5 (data) + Zustand (global state)
- **Navigation:** `expo-router` (file-based)
- **Icons:** `@expo/vector-icons`
- **Animations:** `react-native-reanimated` v3
- **Haptics:** `expo-haptics` (subtle only)
- **Accessibility:** VoiceOver/TalkBack required for all interactive elements

---

## File Structure

```jsx
src/
├── domain/               # Pure business logic (no React)
│   ├── vocabulary/
│   ├── quiz/
│   ├── user/
│   └── gamification/
├── application/         # Use cases (orchestration)
│   ├── quiz/
│   ├── tier/
│   └── user/
├── infrastructure/      # External dependencies
│   ├── db/              # SQLite queries
│   ├── sync/            # Supabase cloud sync
│   ├── iap/             # In-app purchases
│   └── storage/         # AsyncStorage wrapper
├── presentation/        # React Native UI (LexiTap-specific)
│   ├── screens/
│   ├── components/
│   └── theme/           # LexiTap branding
└── config/              # App-specific config
```

- Tests alongside source: `foo.tsx` → `foo.test.tsx`
- Integration tests in `__tests__/integration/`

---

## Testing

- Every new component/hook needs unit tests
- "Tests pass" = `npm test` + `npm run typecheck` + `npm run lint` all exit 0
- Coverage target: ≥75% on new code
- Mocks: Jest's `jest.mock`
- Test on iOS Simulator AND Android Emulator for critical features

---

## Offline-First Rules

1. **All word data bundled** — no initial download
2. **SQLite is source of truth** — never rely on network
3. **No analytics/tracking** requiring network
4. **Graceful no-op** if network features unavailable

---

## Database Conventions

**Active-word queries — always filter soft-deleted rows:**

- ✅ `SELECT * FROM words WHERE tier_id = ? AND deleted_at IS NULL`
- ❌ `SELECT * FROM words WHERE tier_id = ?`
- **Exception:** history / audit queries (e.g., `quiz_attempts` joined to `words`) MUST NOT filter — they need to render historical rows for words that have since been removed.
- Rule of thumb: if the query feeds the *learn / review queue*, filter. If it feeds *history / stats / replay*, don't filter.

**Append-only tables — never UPDATE, never DELETE:**

- `quiz_attempts` — immutable review log
- `event_log` — immutable audit / replay log
- If a row needs correcting, **insert a compensating row.** Do not mutate.
- Rationale: enables future scheduler migration (e.g., FSRS replay) and preserves audit trail integrity.

**Schedulers are version-tagged:**

- `user_progress.scheduler_version` defaults to `'v1-fixed'` (the current 1/3/7/14/30 fixed-interval scheduler).
- Every new review writes that version into `quiz_attempts.scheduler_version`.
- Keep old scheduler implementations addressable by file path: `src/srs/v1-fixed.ts`, `src/srs/v2-fsrs.ts`, etc.
- During a scheduler migration: write new state with new version; old `quiz_attempts` rows keep their original `scheduler_version` so replay uses the correct logic.

**Timezone for streak logic:**

- Streak boundary uses the user's IANA timezone from AsyncStorage (`user.timezone`).
- **Never use `new Date()` directly for streak boundary comparison** — always convert to the stored user tz first.
- Default at install: `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- User-changeable in Settings; no retroactive re-anchoring of past boundaries.

**Event log writes are synchronous, not async:**

- On any user action that should fire an event (review_completed, session_ended, tier_unlocked, etc.), write to `event_log` AND update the relevant stats table in the same local transaction.
- Do **not** introduce a background worker / queue / debounce layer. The log exists for future replay, not for async aggregation — right-sized for current scale.

---

## Accessibility Baseline

- **WCAG 2.1 Level AA** compliance
- **Dynamic Type** support
- **High-contrast mode** for quizzes
- **Screen reader labels** on all interactive elements
- **Minimum touch target:** 44×44 dp

---

## Commits

- **Format:** `<type>(<scope>): <subject>`
- **Types:** feat, fix, chore, refactor, docs, test, ui
- **Example:** `feat(quiz): add drag-drop assessment widget`
- **Branch naming:** `<type>/<short-slug>`
- **PR description must reference plan_id**

---

## Things to Do on Every Task

**Before writing any code:**

0. **Planning Gate — mandatory.** Produce a written implementation plan covering: what changes, which files, which layers, which tests, and potential failure modes. Then invoke the *Planning Adversary* persona (see Adversarial Review Protocol below): challenge the plan, identify ambiguities, check for unintended side-effects across the architecture. Only proceed once the plan survives adversarial challenge. No code before plan is challenged.

**During implementation:**

1. Read relevant `docs/plans/NNN_*.yaml`
2. Read `docs/architecture.md` if touching new components
3. Check `docs/adr/` for relevant decisions
4. Run `npm run check` before declaring complete
5. Test on both iOS and Android if touching UI

**Before marking complete:**

6. **Adversarial Review Gate — mandatory.** Invoke all reviewer personas from the Adversarial Review Protocol below whose trigger conditions are met. If any checklist item fails, fix it before marking complete. Do not skip reviewers because the change "looks fine."

**After marking complete:**

7. **Compound Learning — mandatory.** If this task surfaced any new quirk, gotcha, pattern, or constraint that would help a future agent avoid wasted work, append it to [AGENTS_MOBILE_CONVENTIONS.md](./AGENTS_MOBILE_CONVENTIONS.md) immediately. One sentence minimum. Institutional knowledge belongs in the doc, not the chat log.

---

## Adversarial Review Protocol

Every task passes through all relevant reviewer personas before being marked complete. Invoke every persona whose trigger condition is met. A false positive costs one minute; a missed check costs hours of debugging.

### Planning Adversary

**Always invoke before writing any code.**

Challenges the implementation plan. Ask: what could go wrong? What dependencies am I missing? What does this change break elsewhere in the system? Is there a simpler approach? Does this violate any pattern in [AGENTS_MOBILE_CONVENTIONS.md](./AGENTS_MOBILE_CONVENTIONS.md) or the architecture docs? The plan must survive this challenge before a single line of code is written.

### 1. Schema Reviewer

**Trigger:** Any change to database schema, migration files, SQLite queries, or anything in `infrastructure/db/`.

- All active-word queries include `WHERE deleted_at IS NULL`?
- No UPDATE or DELETE on `quiz_attempts` or `event_log` (append-only — insert compensating rows only)?
- New tables include `deleted_at` for soft-delete?
- Scheduler version tagged on all SRS-related writes (`quiz_attempts.scheduler_version`)?
- Timezone handling uses stored `user.timezone` — not `new Date()` directly?
- No raw SQL strings — parameterized queries only?
- No orphan `words` rows — every entry has ≥1 example sentence?

### 2. SRS Logic Reviewer

**Trigger:** Any change to scheduler code, review queue generation, `user_progress` updates, or streak logic.

- Daily review cap enforced? No unbounded backlog surfacing in one session?
- Catch-up logic soft-rebalances `next_review_date` across missed days — no full-dump?
- Return-after-gap tone is welcoming (*"let's pick up where we left off"*) — not punitive (*"87 overdue reviews"*)?
- No red-badge notification count accumulating for overdue reviews?
- `scheduler_version` tagged on every write to `quiz_attempts`?
- SRS logic lives in `domain/` layer — no business logic leaking into `infrastructure/` or `presentation/`?

### 3. Content Pipeline Reviewer

**Trigger:** Any change to the content tool CLI, word import / enrich scripts, or `words` table data.

- No orphan words — every entry has ≥1 example sentence (CLI `validate` gate enforces this)?
- Multi-word entries (idioms, phrasal verbs) use `word_type` field correctly (`"idiom"` / `"phrasal_verb"`), treated as atomic units?
- Distractors for multi-word entries sampled from same `tier_id` — not from the general word pool?
- `word_count` populated from actual sourced content — never pre-committed at planning time?
- Audio files present for tiers requiring audio (TOEFL at launch; re-evaluate per post-launch tier)?
- No copyright-infringing content in sourced word lists or example sentences?

### 4. Paywall / IAP Reviewer

**Trigger:** Any change to IAP logic, paywall UI, entitlement checking, Premium Pass logic, or `content_tiers.is_active`.

- Premium Pass automatically unlocks ALL current AND future paid tiers when new content drops activate (`is_active` flip)?
- IAP product IDs match `content_tiers.store_product_id` exactly — no hardcoded strings scattered outside the table?
- Paywall / entitlement logic lives in `application/` layer — not in `domain/` or `presentation/`?
- Paywall copy contains no specific word counts (content sourcing determines actuals; tier names and CEFR levels are the durable claims)?
- No auto-renewal deception patterns or dark patterns in subscription / purchase UX copy?

### 5. UX / Mobile Reviewer

**Trigger:** Any change to quiz screens, assessment components, or anything in `presentation/screens/` or `presentation/components/`.

- No `TextInput` in `src/screens/quiz/` or `src/components/assessments/` (banned — defeats no-typing UX)?
- All interactive elements have VoiceOver / TalkBack `accessibilityLabel`?
- All touch targets ≥44×44 dp?
- Dark mode support in all new components?
- Network not required in quiz or review flows (offline-first rule — `SQLite is source of truth`)?
- No keyboard / typing required anywhere in the user-facing quiz experience?