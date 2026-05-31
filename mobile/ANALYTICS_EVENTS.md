# LexiTap Analytics Events Schema

Event schema for PostHog learner-action instrumentation. All events fire to EU host (`https://eu.i.posthog.com`), pseudonymously (`anon_id` only, no email/user_id), and respect user opt-out setting.

**Policy:** env-gated (`EXPO_PUBLIC_POSTHOG_API_KEY`), no-PII, autocapture-off, purpose-limited to app improvement. See CLAUDE.md Forbidden Patterns + RELEASE_PLAN A7.

---

## Core Learner Actions

### `lesson_started`
User began a quiz session.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `tier_id` | string | Yes | Tier being practiced (e.g. `"foundation"`, `"ielts_reading"`) |
| `mode` | string | Yes | Quiz mode (`"review"`, `"learn"`, `"diagnostic"`) |

**Example:** `{ tier_id: "foundation", mode: "review" }`

**Fire site:** `HomeScreen.tsx` → `onStartReview()` / `onLearnNewWords()` button click

---

### `lesson_completed`
User finished a quiz session (all questions answered, session marked complete).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `tier_id` | string | Yes | Tier practiced |
| `mode` | string | Yes | Quiz mode |
| `total_correct` | number | Yes | # of correct answers in session |
| `total_attempts` | number | Yes | Total questions answered (sessions are fixed-length) |
| `duration_sec` | number | Yes | Time from session start to completion, in seconds |

**Example:** `{ tier_id: "foundation", mode: "review", total_correct: 8, total_attempts: 10, duration_sec: 145 }`

**Fire site:** `QuizScreen.tsx` → phase transitions to `{ kind: 'complete' }`

---

### `quiz_submitted`
User answered a single quiz question.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `tier_id` | string | Yes | Tier being practiced |
| `assessment_type` | string | Yes | `"multiple_choice"` or `"drag_drop"` |
| `is_correct` | boolean | Yes | Whether user answer matched correct answer |

**Example:** `{ tier_id: "foundation", assessment_type: "multiple_choice", is_correct: true }`

**Fire site:** `QuizScreen.tsx` → `handleAnswer()` every question (redundant with `answer_recorded` event logged to event_log, but separate for PostHog funnel analysis)

**Note:** `answer_recorded` is already fired by `AnswerQuestionUseCase` (unmodified). This event duplicates that telemetry for PostHog retention cohorts.

---

### `streak_maintained`
User opened Progress screen or Home screen; streak state evaluated.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `current_streak` | number | Yes | Current streak length (e.g. `5`) |
| `at_risk` | boolean | Yes | Whether streak is at risk (last session > 1 day ago) |

**Example:** `{ current_streak: 5, at_risk: false }`

**Fire site:** `ProgressScreen.tsx` → `useEffect` on mount (once, after stats load)

**Rationale:** Engagement signal; whether users are maintaining daily consistency or at risk of lapse.

---

## Monetization Events

### `paywall_viewed`
User opened the exam pack / premium paywall.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `source` | string | Yes | How user reached paywall: `"home"`, `"progress"`, `"settings"`, `"quiz_complete"`, etc. |

**Example:** `{ source: "quiz_complete" }`

**Fire site:** `PaywallScreen.tsx` → component mount (`useEffect` with `onMount` semantics)

---

### `purchase_initiated`
User clicked a "Subscribe"/"Buy" button on the paywall (not yet confirmed by RevenueCat).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `tier_id` | string | Yes | Exam pack SKU / tier being purchased (e.g. `"ielts_reading"`) |
| `amount` | number | Yes | List price in USD (e.g. `9.99`) |

**Example:** `{ tier_id: "ielts_reading", amount: 9.99 }`

**Fire site:** `PaywallScreen.tsx` → `handleSubscribe()` before any RevenueCat call

---

### `purchase_completed`
RevenueCat confirmed a successful purchase (receipt validated, entitlement granted).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `tier_id` | string | Yes | Exam pack SKU / tier purchased |
| `amount` | number | Yes | Actual revenue in USD (after discounts, taxes). For MVP: same as list price |

**Example:** `{ tier_id: "ielts_reading", amount: 9.99 }`

**Fire site:** `IapService` (or container) after RevenueCat purchase handler succeeds (R1: pending RevenueCat wiring)

---

## Deprecated / Future Events

These are reserved for future use (Phase 2+) and should **not** be fired in A1–A5:
- `content_viewed` — diagnostic, knowledge-map reveal
- `profile_completed` — onboarding goal/band/frontier set
- `feature_flagged` — variant assignment (if a/b testing added)
- `error_boundary_caught` — crash or offline state

---

## Implementation Notes

1. **No Autocapture:** All events are explicit `analytics.track(...)` calls in use cases / screens. PostHog autocapture is disabled.

2. **Session Enrichment:** `session_id` is automatically injected by `PostHogAnalyticsService.track()` for every event. Do not pass `session_id` in the payload.

3. **Opt-Out Respected:** `PostHogAnalyticsService.track()` checks the opt-out flag before each `capture()`. No additional checks needed in screens.

4. **PII Filtering:** All payloads below are clean (no email, user_id, session tokens, URLs, device names). Use cases are responsible for sanitizing before calling `analytics.track()`.

5. **Fire-and-Forget:** `track()` is async but called without `await` in most screens. Failures are swallowed by `PostHogAnalyticsService` (never crash the app).

---

## Retention Analysis (P-2 Gating)

**RELEASE_PLAN A7:** D7 retention will be measured via `lesson_completed` count (learner completed >= 1 session on day 7 post-onboarding).

**Cohort:** Users who saw paywall on day 0 or 1 (free content exhausted).

**Metric:** % of cohort with `lesson_completed` after paywall view.

---

*Last updated: 2026-05-31 — A1–A5 implementation*
