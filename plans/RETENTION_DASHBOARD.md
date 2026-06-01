---
title: "P2 — PostHog Retention Dashboard Setup"
status: active
phase: "P2"
updated: 2026-05-31
---

# P2 — PostHog Retention Dashboard Setup

Operational guide for configuring PostHog cohort analysis, retention reporting, and alert conditions to measure the P2 exit gate (D7 ≥ 30%).

---

## 1. PostHog Project Provisioning

### Prerequisites

Before starting dashboard config, ensure:

- [ ] **PostHog account created** at https://posthog.com
- [ ] **Project created** (name: "LexiTap-Beta" or "LexiTap")
- [ ] **API key** (`EXPO_PUBLIC_POSTHOG_API_KEY`) provisioned + saved to password manager
- [ ] **EU host** (`https://eu.i.posthog.com`) selected during project setup (GDPR compliance)
- [ ] **API key set in EAS secrets:** `eas secrets create` (both iOS and Android builds)
- [ ] **Test event received:** Run app on simulator; open PostHog Events table; see `session_started` event with `distinct_id` (anon_id) in payload

### Verify Connection

1. Build and run app locally (Expo dev server or EAS build on device)
2. Open PostHog dashboard → **Insights** → **Events**
3. Set filter: `event = "session_started"`
4. Should see ≥1 event within 30s of opening app
5. Click event to expand payload; confirm:
   - `distinct_id` is a UUID (not email, not Supabase ID)
   - `session_id` is present
   - No PII fields (email, token, device name, IP)
   - `onboarding_goal` and `frontier_rank` are populated (if post-onboarding)

If no events appear: check EAS logs for `EXPO_PUBLIC_POSTHOG_API_KEY` presence; confirm build includes PostHog adapter (`createAnalyticsService` is not returning `NoopAnalyticsService`).

---

## 2. Dashboard Structure

Create **one master dashboard** with these sections:

### Section A: Key Metrics (Real-time)

Widgets showing live retention rates + volume.

| Widget | Metric | Query |
|--------|--------|-------|
| **D1 Volume** | Count of users with `session_started` in last 24h | `select count(distinct_id) where event='session_started' and timestamp > now() - interval '24 hours'` |
| **D7 Rate (%)** | (Users with event on day 7) / (Users with session_started on day 0) × 100 | See §2A cohort query below |
| **D30 Rate (%)** | (Users with event on day 30) / (Users with session_started on day 0) × 100 | See §2A cohort query below |
| **Crash Rate (%)** | (Sessions with Sentry error) / (Total sessions) × 100 | `select count(distinct session_id) with sentry_error / count(distinct session_id) × 100` |
| **Avg Session Duration** | Mean `session_duration_sec` across all sessions | `select avg(session_duration_sec) where event='session_completed'` |

### Section B: Retention Cohorts (Trend)

Multi-week view of D7 retention per cohort (group users by install week).

| Cohort | D1 Size | D7 Size | D7 Rate | Week |
|--------|---------|---------|---------|------|
| May 31 – Jun 6 | 62 | 24 | 39% | Week 1 |
| Jun 7 – Jun 13 | 41 | 10 | 24% | Week 2 |
| Jun 14 – Jun 20 | 55 | 19 | 35% | Week 3 |

**Dashboard widget:** Line chart with D7 rate on Y-axis, week on X-axis. Alert if trending <25%.

### Section C: Segment Breakdown (By Onboarding Goal)

Repeat retention metrics for each goal (exam, professional, general).

| Goal | D1 | D7 | D7 Rate | Signal |
|------|----|----|---------|--------|
| **Exam** | 28 | 12 | 43% | Good; higher motivation |
| **Professional** | 20 | 6 | 30% | OK; on gate threshold |
| **General** | 14 | 3 | 21% | Churn; content/difficulty mismatch? |

**Dashboard widget:** Bar chart with D7 rate per goal. Alert if any segment <20%.

### Section D: Platform Breakdown

iOS vs Android comparison.

| Platform | D1 | D7 | D7 Rate | Crash Count | Avg Duration |
|----------|----|----|---------|-------------|---|
| **iOS** | 35 | 14 | 40% | 2 | 8.2 min |
| **Android** | 27 | 10 | 37% | 5 | 7.1 min |

**Dashboard widget:** Side-by-side bar chart. If iOS D7 > Android D7 by >15%, debug Android crashes (check Sentry).

### Section E: Funnel Analysis

Where testers drop off between onboarding → quiz.

| Stage | Count | Drop % | Cumulative |
|-------|-------|--------|-----------|
| App Open | 100 | — | 100% |
| Age Gate Pass | 97 | 3% | 97% |
| Goal Selection | 89 | 8% | 89% |
| Diagnostic Complete | 76 | 13% | 76% |
| KM Reveal | 73 | 3% | 73% |
| First Quiz Start | 52 | 27% | 52% |
| First Quiz Complete | 43 | 17% | 43% |

**Dashboard widget:** Funnel visualization (or table with drop % column). Alert if any stage drop >20%.

### Section F: Event Heatmap (Engagement)

Daily active users over time; highlights engagement patterns.

```
       Sun Mon Tue Wed Thu Fri Sat
May 31       12  18  22  15   8   5
Jun  7  10   9  14  11  16   7   3
Jun 14   8  11  13   9  12   6   5
Jun 21   7   6   8   5   9   4   2
```

**Dashboard widget:** Heatmap with day on X, calendar week on Y, DAU color-coded (darker = higher). Alert if any day <3 DAU (churn spike).

---

## 3. Cohort Definitions (PostHog Setup)

Create these cohorts in PostHog **Cohorts** section. Each cohort is a reusable filter for dashboard widgets.

### Cohort 1: D1 Users (Install Cohort)

**Name:** `D1_Cohort_Week_1`  
**Definition:**
```
users with event = "session_started"
  where timestamp >= 2026-05-31 00:00:00 UTC
  and   timestamp < 2026-06-07 00:00:00 UTC
```

**Reuse:** For computing D7, D30 (filter existing cohort by retention window).

### Cohort 2: D7 Retention (Cohort 1, + activity on day 7)

**Name:** `D7_Retained_Week_1`  
**Definition:**
```
users in D1_Cohort_Week_1
  with any event (where event != "srs_backlog_reanchored")
  where timestamp >= 2026-06-07 00:00:00 UTC
  and   timestamp < 2026-06-14 00:00:00 UTC
```

**Rate computation:** (Cohort 2 size) / (Cohort 1 size) × 100%

### Cohort 3: D7 Retained — Exam Goal

**Name:** `D7_Retained_Exam_Goal_Week_1`  
**Definition:**
```
users in D7_Retained_Week_1
  with property "onboarding_goal" = "exam"
```

### Cohort 4: D7 Retained — Android

**Name:** `D7_Retained_Android_Week_1`  
**Definition:**
```
users in D7_Retained_Week_1
  with property "platform" = "android"
  [if platform property logged; else use User Properties / app_version matching]
```

---

## 4. Dashboard Widget Queries (PostHog Insights)

### Widget 1: D7 Retention — Main Gate Metric

**Type:** Number  
**Query:**
```sql
SELECT
  (SELECT COUNT(DISTINCT distinct_id)
   FROM events
   WHERE event IN ('session_started', 'lesson_completed', 'streak_event')
   AND cohort_id = 'D7_Retained_Week_1') /
  (SELECT COUNT(DISTINCT distinct_id)
   FROM events
   WHERE event = 'session_started'
   AND cohort_id = 'D1_Cohort_Week_1') * 100
AS d7_retention_rate
```

**Expected:** ≥30% (gate pass)  
**Alert:** <25% (escalate)

### Widget 2: Cohort Analysis Table

**Type:** Cohort Retention  
**Rows (Cohorts):** `D1_Cohort_Week_1`, `D1_Cohort_Week_2`, `D1_Cohort_Week_3` (rolling weekly)  
**Columns:** D1, D7, D14, D21, D30 (running count of retained users)  
**Metrics:** Retention rate (%) per cohort per day

**PostHog native feature:** Use **Cohort Retention** insight (built-in); define cohort on D1, then postage-stamp table shows D2, D3... D30 retention automatically.

### Widget 3: Retention by Onboarding Goal

**Type:** Bar Chart  
**Query:**
```sql
SELECT
  properties.onboarding_goal as goal,
  COUNT(DISTINCT distinct_id) as d1_count,
  (SELECT COUNT(DISTINCT d.distinct_id)
   FROM events d
   WHERE d.properties.onboarding_goal = properties.onboarding_goal
   AND d.timestamp >= now() - interval '7 days'
   AND d.event != 'srs_backlog_reanchored') as d7_count,
  ROUND(100.0 * d7_count / d1_count, 1) as d7_rate
FROM events
WHERE event = 'session_started'
AND timestamp >= now() - interval '14 days'
GROUP BY goal
ORDER BY d7_rate DESC
```

**Expected:** Exam >35%, Professional >30%, General >20%  
**Alert:** Any segment <20%

### Widget 4: Crash Rate

**Type:** Gauge / Number  
**Query:**
```sql
SELECT
  ROUND(100.0 * 
    (SELECT COUNT(DISTINCT session_id) FROM events
     WHERE sentry_error IS NOT NULL) /
    (SELECT COUNT(DISTINCT session_id) FROM events),
  1) as crash_rate_pct
```

**Expected:** <3%  
**Alert:** >5%

### Widget 5: Onboarding Funnel

**Type:** Funnel  
**Steps:**
1. `event = 'session_started'` (D1)
2. `event = 'onboarding_goal_selected'` (O-2, if logged; else skip)
3. `event = 'onboarding_diagnostic_completed'` (O-4)
4. `event = 'onboarding_km_revealed'` (O-5)
5. `event = 'lesson_completed'` (First quiz)

**Ordering:** By `timestamp` (chronological per user)

**Expected:** Step 1→5 conversion ≥40% (many drop after O-5 paywall; OK)

### Widget 6: Daily Active Users (DAU) Heatmap

**Type:** Heatmap  
**Query:**
```sql
SELECT
  DATE(timestamp) as date,
  COUNT(DISTINCT distinct_id) as active_users
FROM events
WHERE event IN ('session_started', 'lesson_completed', 'streak_event')
AND timestamp >= now() - interval '30 days'
GROUP BY DATE(timestamp)
ORDER BY DATE(timestamp) ASC
```

**Visual:** Heatmap with calendar dates on X-axis, week-of-year on Y-axis; cell color = DAU count.

**Expected:** Steady or growing DAU (no cliff drops)  
**Alert:** Any date <5 DAU (possible outage or no installs that day)

---

## 5. Alert Configuration

### Alert 1: D7 Retention Below 25%

**Trigger:** D7 retention rate <25%  
**Frequency:** Daily (check at 9am local time)  
**Action:** Slack/Email to Ryan

```
⚠️ LexiTap P2 Alert: D7 Retention < 25%
Current D7 rate: 22%
Cohorts affected: General learners (18%), Professional (25%)
Recommended: Debug funnel drop at "First Quiz" (52→43 users, -17%)
Dashboard: https://posthog.com/project/.../insights/...
```

### Alert 2: Crash Rate Above 5%

**Trigger:** Crash rate >5%  
**Frequency:** Daily  
**Action:** Slack/Email + auto-create GitHub issue (if integrated)

```
🔥 LexiTap P2 Alert: High Crash Rate
Current crash rate: 6.2%
Top crash: "SQL ATTACH 'words.db' failed" (12 occurrences)
Affected platform: Android 12 (low-end devices)
Sentry link: https://sentry.io/...
```

### Alert 3: Zero D1 Users in Last 24h

**Trigger:** D1 count (last 24h) = 0  
**Frequency:** Daily  
**Action:** Slack warning (recruitment may have stalled)

```
ℹ️ LexiTap P2 Info: No new installs in 24h
Last install: 2026-06-05 14:22 UTC
Recommendation: Re-seed Reddit, Discord channels with updated link
```

---

## 6. Setup Checklist

### PostHog Configuration

- [ ] **Project created** (name: LexiTap-Beta)
- [ ] **EU host selected** (`https://eu.i.posthog.com`)
- [ ] **API key provisioned** + added to EAS secrets
- [ ] **Test event received** (verify `session_started` in Events table)
- [ ] **Custom events configured** (ensure all app events are in PostHog schema):
  - [ ] `session_started`
  - [ ] `session_completed`
  - [ ] `lesson_completed`
  - [ ] `streak_event`
  - [ ] `paywall_viewed`
  - [ ] `srs_backlog_reanchored`

### Cohorts Created

- [ ] **D1_Cohort_Week_1** (users with `session_started` on install week)
- [ ] **D7_Retained_Week_1** (D1 users + activity on day 7)
- [ ] **D7_Retained_Exam_Goal_Week_1** (D7 + exam goal filter)
- [ ] **D7_Retained_Android_Week_1** (D7 + android filter)

### Dashboard Widgets Built

- [ ] **Widget 1:** D7 Retention Rate (number) — **MAIN GATE METRIC**
- [ ] **Widget 2:** Cohort Retention Table (multi-week comparison)
- [ ] **Widget 3:** Retention by Goal (bar chart)
- [ ] **Widget 4:** Crash Rate (gauge)
- [ ] **Widget 5:** Onboarding Funnel (funnel chart)
- [ ] **Widget 6:** Daily Active Users (heatmap)

### Alerts Configured

- [ ] **Alert 1:** D7 <25% (escalation email)
- [ ] **Alert 2:** Crash >5% (escalation email)
- [ ] **Alert 3:** D1 = 0 in 24h (info notification)

### Dashboard Access

- [ ] **Shared read-only link** created (for team review)
- [ ] **Slack channel** `#p2-metrics` created (for daily digest)
- [ ] **Scheduled email reports** set up (daily 9am, summary of 3 main metrics)

---

## 7. Data Interpretation Checklist

### Before declaring D7 gate pass/fail, validate:

- [ ] **D1 cohort size ≥40** (statistical significance; <30 is too noisy)
- [ ] **No duplicate distinct_id** (count distinct IDs; should match D1 size)
- [ ] **Event firehose reasonable** (5–50 events per user per day; <3 = users not engaging, >200 = phantom logging)
- [ ] **Timezone alignment** (D7 window spans user's local midnight, not UTC)
- [ ] **No data backfill gap** (if re-running cohort, confirm timestamps are contiguous)
- [ ] **Sentry PII check** (sample 5 random Sentry errors; confirm no email/token/IP in breadcrumbs)

### If any validation fails:

1. **Duplicate distinct_id:** Check SharedStorage key collision in code; recompute cohort excluding duplicates
2. **Event firehose <3:** Check if app is actually sending events; verify `EXPO_PUBLIC_POSTHOG_API_KEY` is in EAS build
3. **Timezone misalignment:** Adjust cohort D7 window to user local time (harder; may require custom script)
4. **Data backfill gap:** Query PostHog Events table for time range; if empty, redeploy app + re-seed recruitment

---

## 8. Retention Deep-Dives (If Gate Fails)

If D7 <20%, run these diagnostic queries to find the root cause:

### Query 1: Funnel Drop Hotspot

```sql
SELECT
  event,
  COUNT(DISTINCT session_id) as session_count,
  COUNT(DISTINCT distinct_id) as user_count,
  timestamp
FROM events
WHERE distinct_id IN (SELECT distinct_id FROM D1_Cohort_Week_1)
ORDER BY timestamp
LIMIT 100
```

**Look for:** Single event with huge drop-off (e.g., `session_started` = 62, then `lesson_completed` = 2 = 97% drop).

### Query 2: Platform-Specific Crashes

```sql
SELECT
  JSON_EXTRACT(properties, '$.platform') as platform,
  COUNT(DISTINCT distinct_id) as user_count,
  COUNT(sentry_error) / COUNT(DISTINCT session_id) as crash_rate
FROM events
WHERE distinct_id IN (SELECT distinct_id FROM D1_Cohort_Week_1)
GROUP BY platform
```

**Look for:** Android crash rate >10% (suggests missing permission, native module bug).

### Query 3: Frontier Estimation Quality

```sql
SELECT
  onboarding_goal,
  AVG(frontier_rank) as avg_rank,
  MIN(frontier_rank) as min_rank,
  MAX(frontier_rank) as max_rank,
  COUNT(DISTINCT distinct_id) as user_count
FROM events
WHERE event = 'session_started'
AND distinct_id IN (SELECT distinct_id FROM D1_Cohort_Week_1)
GROUP BY onboarding_goal
```

**Look for:** Outliers (>80% of users estimated at rank 5000 or <500 = diagnostic is broken).

### Query 4: Time-to-First-Quiz

```sql
SELECT
  EXTRACT(HOUR FROM (
    MIN(CASE WHEN event = 'lesson_completed' THEN timestamp END) -
    MIN(CASE WHEN event = 'session_started' THEN timestamp END)
  )) as hours_to_first_quiz,
  COUNT(DISTINCT distinct_id) as user_count
FROM events
WHERE distinct_id IN (SELECT distinct_id FROM D1_Cohort_Week_1)
GROUP BY EXTRACT(HOUR FROM ...)
ORDER BY hours_to_first_quiz ASC
```

**Look for:** Distribution. If >50% never have `lesson_completed` (NULL), they quit before first quiz → paywall friction.

---

## 9. Known Issues & Workarounds

| Issue | Workaround |
|-------|-----------|
| PostHog timezone is UTC; users in PT, CET, IST | Manually adjust D7 window: instead of day 7, use days 7–13 to account for user local midnight scatter |
| Duplicate distinct_id if user reinstalls | Add `DISTINCT` to all count queries; manually filter in cohort definition |
| `session_completed` not logged if app crashes | Complement with `session_started` count; retention = users with ≥1 event on day 7 (not necessarily completed) |
| PostHog Cohort Retention widget has max 30-day lookback | Create manual dashboard with custom SQL queries instead (see Widget 2 above) |
| `platform` property (iOS vs Android) | Sent as `platform` on every `session_started` event via `SessionStartedUseCase` (wired in container.ts). Use `properties.platform` in PostHog cohort filters. |

---

## 10. Post-Launch Rollover

Upon D7 gate decision:

- [ ] **Save dashboard as template** (File → Download / Clone)
- [ ] **Archive cohort data** (export PostHog Events CSV for weeks 1–4)
- [ ] **Summarize learnings** (which goal had best retention? platform issues? funnel hotspot?)
- [ ] **Update ROADMAP.md** with actual D7 rate (for future phase comparisons)
- [ ] **Commit memory file** (`memory/2026-06-14_p2_retention_results.md`)

---

**Linked docs:**
- [P2_BETA_PLAN.md](P2_BETA_PLAN.md) — Full measurement framework, diagnostics, exit criteria
- [P2_RECRUITMENT_CHECKLIST.md](P2_RECRUITMENT_CHECKLIST.md) — Build setup, manual QA, feedback collection

---

*Last updated: 2026-05-31 — PostHog dashboard setup, cohort definitions, widget queries, alerts, validation checklist, and diagnostic deep-dives for root-cause analysis if D7 < 20%.*
