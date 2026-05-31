---
title: "P2 — Beta Recruitment & Retention Measurement"
status: active
phase: "P2"
exit_gate: "D7 ≥ 30% (anon_id cohorts)"
updated: 2026-05-31
---

# P2 — Beta Recruitment & Retention Measurement

**Phase 2 exit gate: D7 ≥ 30%** (7-day retention on `anon_id` pseudonymous cohorts). Below 30% triggers a fix loop; below 20% means pivot/kill decision.

**Timeline: 1–4 weeks minimum for stable D7 data** (depends on tester volume and daily active churn). Target recruitment: 60–70 testers (net ≥ 50 active in days 2–7).

---

## 1. Recruitment Strategy

### Target Audience
- Non-native English learners, 16+ (age gate active: `/onboarding/age`)
- Global: ESL communities, Reddit, Discord, Slack language-learning groups
- Professional: working professionals studying for exams (TOEFL, IELTS, GMAT, GRE)
- Academic: university ESL programs, student visa visa prep

### Recruitment Channels

| Channel | Volume | Effort | Lead time | Notes |
|---------|--------|--------|-----------|-------|
| **TestFlight (iOS)** | 30–40 | External link (no review) | 1–2 days | Primary iOS channel; unlimited testers; public link; seed via newsletter / communities |
| **Google Play Internal Test** | 20–30 | Closed group (managed by link) | 1 day | Android; manual tester management; same public link as TF |
| **Reddit r/EnglishLearning** | 5–10 | 1 post + comments | 1 week | Large audience; competitive, may not survive moderation |
| **Discord (Polyglot, LingoStorm, etc.)** | 10–15 | Channel intro post | 1–2 days | Rapid feedback; engaged community |
| **Slack (TechWriters, ESL coaches, etc.)** | 3–5 | Direct DM / org channel | 1–2 days | Niche, higher quality; slower signups |
| **Email (existing contacts)** | 5–10 | Personal + BCC list | Same day | High convert; limited pool |

### Recruitment Flow

```
Week 1: Seed channels (TF external link → all communities)
  ↓
Days 2–7: Monitor signups → target 50+ active (D1+ users)
          Manual QA matrix run in parallel
  ↓
Day 8+: Run analytics — compute D7 cohort
        D7 ≥ 30% → proceed P3
        20–29% → identify fix loop (see §3 Diagnostics)
        <20% → convene pivot/kill decision
```

### TestFlight External Link Setup (Owned)

1. Build signed IPA via EAS: `eas build --platform ios --profile beta`
2. Create TestFlight app (via App Store Connect)
3. Upload build + set beta testers to "External"
4. Generate public link: `https://testflight.apple.com/join/...`
5. Distribute link via all channels (no manual invite needed)

### Google Play Internal Test Setup (Owned)

1. Build signed APK via EAS: `eas build --platform android --profile beta`
2. Create Play Console internal test track
3. Upload build + generate shareable link
4. Same link for all testers (no roster management)

---

## 2. Measurement Framework

### Event Definitions (PostHog)

Every retention metric is computed from anonymous `anon_id` pseudonymous cohorts. **Cohort = set of users who installed in the same calendar date.**

| Metric | Event | Timestamp | Property | Semantics |
|--------|-------|-----------|----------|-----------|
| **D1 (Day 1)** | `session_started` | First session ever | `is_d1_user: true` (internal flag) | User completed onboarding age gate + entered Home for first time |
| **D7 (Day 7)** | Any logged event | ≥7 days after install | Cohort date + event date | User had ≥1 event in days 7–13 (rolled 7-day window) |
| **D30 (Month)** | Any logged event | ≥30 days after install | Cohort date + event date | User had ≥1 event in days 30–40 (rolled 30-day window) |

### Logging Events (Already Wired)

Core application layer (`mobile/src/application/analytics/*`) fires these events; infrastructure (`infrastructure/analytics/PostHogAnalyticsService`) routes to PostHog only if `EXPO_PUBLIC_POSTHOG_API_KEY` is set (no PII).

| Event | Fired | Properties | Semantics |
|-------|-------|-----------|-----------|
| `session_started` | Home screen loads after onboarding complete | `onboarding_goal`, `frontier_rank` | User completed full onboarding (O-1…O-5) |
| `session_completed` | App backgrounded or explicitly closed | `session_duration_sec`, `lesson_count` | User-initiated session end (time + work product) |
| `lesson_completed` | Quiz session finalized (mastered / skipped) | `word_id`, `tier_id`, `is_pass` | Per-word quiz result (used for drill-down) |
| `streak_event` | Streak milestone hit (day 1, day 7, day 30, etc.) | `streak_days`, `goal_type` | Engagement signal; morale booster |
| `paywall_view` | Paywall screen rendered | `tier_id`, `cta_clicked` | Monetization funnel (defer analysis to P3) |
| `srs_backlog_reanchored` | Recompute backlog (startup, resuming after idle) | `reanchor_reason` | System event; diagnostics only |

**Event payload shape (all events):**
```typescript
{
  event_name: "session_started" | "lesson_completed" | ...,
  distinct_id: "anon_id" (device UUID),  // no email/supabase-id ever
  properties: {
    session_id: "uuid",                  // session identifier
    onboarding_goal?: "exam" | "general" | "professional",  // if applicable
    frontier_rank?: number,              // estimated knowledge frontier (0–5000)
    word_id?: number,                    // if word-specific event
    tier_id?: string,                    // "foundation" | "advanced" | "toefl" | ...
    lesson_count?: number,               // lessons completed in session
    is_pass?: boolean,                   // word mastered or skipped
    streak_days?: number,                // current streak
    [PII_FORBIDDEN]: undefined,          // no email/token/device-name/URLs
  }
}
```

### Cohort Retention Computation

In PostHog, create three retention cohorts:

1. **D1 Cohort** — Users who triggered `session_started` on day 0 (install day)
2. **D7 Cohort** — Subset of D1 who had ≥1 event on day 7 (or day 8–13 to account for time zones)
3. **D30 Cohort** — Subset of D1 who had ≥1 event on day 30 (or day 31–40)

**Retention rates:**
- **D7 = (D7 cohort size) / (D1 cohort size)** × 100%
- **D30 = (D30 cohort size) / (D1 cohort size)** × 100%

**Exit gate:** **D7 ≥ 30%**

---

## 3. Data Analysis & Diagnostics

### Cohort Breakdown (Segment by Onboarding Profile)

For each D1 cohort, slice retention by:

| Segment | Computation | Signal |
|---------|-----------|--------|
| **By Onboarding Goal** | D7 retention within goal=exam vs goal=professional vs goal=general | Exam seekers (higher motivation) should have higher D7; general learners may churn faster |
| **By CEFR Band** | D7 retention within estimated frontier band (A1–B2, based O-4 diagnostic) | Lower bands (A1/A2) may churn faster if content is too hard; higher bands (B1/B2) if too easy |
| **By Platform** | D7 retention iOS vs Android | Expect iOS slightly higher (TestFlight bias; iOS users tend older/more engaged); large gap signals platform-specific bug |
| **By Session Duration** | D7 within cohort of users with session_duration ≥5min on D1 | Users who spent >5min on D1 more likely to return; signals engagement threshold |

### Drop-off Points (Funnel Slicing)

Identify where testers abandon:

| Funnel Stage | Metric | Target |
|---|---|---|
| **Age Gate** | (Completed age gate) / (Opened app) | ≥95% pass (only <16yo bounce) |
| **Welcome → Goal Selection** | (Completed goal) / (Entered welcome) | ≥90% (O-2 drop) |
| **Goal → Diagnostic** | (Completed diagnostic) / (Started goal) | ≥85% (O-4 drop; diagnostics can feel tedious) |
| **Diagnostic → Knowledge Map** | (Viewed KM) / (Completed diagnostic) | ≥85% (O-5 reveal) |
| **KM → First Quiz** | (Started lesson) / (Viewed KM) | ≥70% (paywall friction; OK to be lower) |
| **Quiz Completion** | (Completed quiz) / (Started quiz) | ≥80% (per-quiz drop; identifies hard tiers) |

**If any stage >15% drop, drill into session logs (Sentry) for crashes; check analytics for error patterns.**

### Failure Modes (What <20% D7 signals)

| D7 value | Likely cause | Diagnostic steps |
|---|---|---|
| **<5%** | Onboarding blocker (crash, age gate loop, blank tier, paywall before quiz) | Check Sentry crash count; confirm age gate advances correctly; verify Foundation tier is loadable |
| **5–15%** | Content or quiz too easy/hard; diagnostic estimate is off-base | Compare frontier-rank estimates per goal; check lesson_completed events — are testers passing >95% (bored) or <30% (frustrated)? |
| **15–20%** | Engagement/UX friction; missing motivational signals (streak, progress bar, daily targets) | Check session duration (should cluster around 5–15min); review feedback channel for pain points; check if paywall placement is blocking <3-lesson users |

### Measurement Validation (Sanity Checks)

Before declaring D7 = gate pass/fail, verify data quality:

| Check | Expected | If fail |
|---|---|---|
| **D1 cohort size** | 50–70 (target recruitment) | <50 → not enough testers, extend beta; >100 → unexpected viral, check for bot installs |
| **Anon_id uniqueness** | (D1 size) distinct `distinct_id` values | Duplicates → SharedStorage key collision (SDK bug; rare but catastrophic for cohort math) |
| **Event firehose** | Average 30–50 events/user/day (session_started + N×lesson_completed + status events) | <10 → testers not actually using app; >200 → phantom events or duplicate logging |
| **Session_id stability** | Each `session_started` increments unique `session_id`; all events in that session carry same `session_id` | Repeating session_id → clock skew or SharedStorage leak; drop session from cohort |
| **Timezone drift** | Dates align with tester's local midnight (not UTC) | If D1 events clustered at UTC midnight instead of tester TZ → PostHog TZ config is wrong; recompute |

---

## 4. Execution Timeline

### Pre-launch (Day 0)

- [ ] Confirm TestFlight + Play Console internal test builds are signed and uploaded
- [ ] Post recruitment links to Discord, Reddit, email
- [ ] Create PostHog project (if not done in A1) and whitelist app origin
- [ ] Verify `EXPO_PUBLIC_POSTHOG_API_KEY` is set in EAS secrets for both iOS + Android builds
- [ ] QA checklist: age gate advances, Home loads, quiz runs, streak displays, no crashes in Sentry
- [ ] Prepare tester feedback channel (Discord #beta-feedback or email alias; pin bug report template)

### Week 1 (Days 0–7)

- [ ] **D1:** Post external link to all channels; monitor signup velocity (target: 3–5/day)
- [ ] **D2–4:** Run manual QA matrix (see P2_RECRUITMENT_CHECKLIST.md) on 3–5 devices
- [ ] **D5–6:** Diagnose and hotfix any critical crash / onboarding blocker via EAS Update
- [ ] **D7:** Monitor PostHog retention cohort in real-time; prepare D7 report

### Week 2 (Days 8–14)

- [ ] **D8–10:** Rerun manual QA on fixed build if hotfixes shipped
- [ ] **D10–14:** Analyze D7 cohort (compute rates per segment; run funnel slicing per §3)
- [ ] **D14:** Hold decision gate meeting:
  - **D7 ≥ 30%** → Declare P2 exit gate met; begin P3 sprint planning
  - **20–29%** → Identify 1–2 highest-leverage fixes; deploy patch; extend beta 7–10 days, re-measure D7
  - **<20%** → Assess if fixable in a week; if not, convene pivot/kill decision (feature cut, monetization rethink, cancel beta entirely?)

### Weeks 3–4 (Optional, if re-measuring)

- [ ] Deploy fixes (typically: easier quiz difficulty, paywall move, streak/streak leaderboard)
- [ ] Re-seed recruitment channels if volume dropped (testers may have churned; refresh community posts)
- [ ] Compute D7 (new cohort) by day 14 of re-run
- [ ] If D7 ≥ 30% on re-run, exit gate passes; else escalate to product/founder for pivot decision

---

## 5. Success Criteria

| Criterion | Pass | Fail |
|-----------|------|------|
| **Recruitment** | ≥60 installs, ≥50 active (D1+ events) by day 7 | <40 installs or <30 active → extend recruitment |
| **Data Quality** | ≥5 events per user per day; <3% duplicate anon_id | <3 events/user or >5% duplicates → debug cohort math |
| **D7 Retention** | ≥30% | <30% → diagnostic + fix loop or pivot decision |
| **Crash Rate** | <3% of sessions have Sentry error | >3% → hotfix + re-measure |
| **Onboarding Completion** | ≥85% users reach Home (post-O-5) | <85% → debug O2/O4 funnel |
| **Quiz Attempt** | ≥70% of users attempt first quiz within 24h of onboarding | <70% → paywall friction or unclear CTA |

---

## 6. Rollover to P3

**If D7 ≥ 30% on day 14 (or re-run day 21), P2 gate is passed.** Next:

1. **Archive beta cohort data** for post-launch comparison (did early adopters differ from mainstream?)
2. **Publish learnings** in `memory/` — which segments had highest retention, what friction points emerged
3. **Publish post-mortem** if fixes were deployed (what broke, how was it caught, how was it fixed?)
4. **Begin P3 sprint** — A0 (EAS dev client), R1–R7 (RevenueCat), AU1–AU3 (auth), and BK1–BK2 (backup)

---

## 7. Key Assumptions & Risks

| Assumption | Risk if false | Mitigation |
|---|---|---|
| **PostHog provisioning complete** (project created, EU key set, privacy policy drafted) | No cohort visibility; D7 becomes unmeasurable | Provision PostHog account **before beta launch** (1–2 hours); test on simulator build |
| **D1 recruit ≥50 users** | <20% D7 becomes statistical noise; fix-vs-churn decision ambiguous | Seed 3+ communities; use email list; offer invite referral bonus (in-game streak or cosmetic badge) |
| **Testers remain active on days 2–7** | D7 cohort shrinks; gate becomes harder to pass | Run engagement campaigns (daily push notifications, streak reminders) — stagger notifications per timezone |
| **Foundation content is hard correct** (no >10% of quiz Qs error)** | Testers blame app for bad Q/As; churn attributed to content, not UX | Spot-check 50 random quiz Qs manually during week 1 |
| **Onboarding O-4 frontier estimate is credible** | Testers given wrong band (too easy/hard); high churn in mismatch segment | Log frontier-rank distribution by goal; if 25%+ are outliers (>3500 or <500), diagnostic is miscalibrated |
| **iOS TestFlight is simpler than Play Closed** (no sign-in friction) | iOS signs up but doesn't install app; Play sees higher D1 | Monitor install-to-first-event ratio per platform; if iOS <50%, debug TestFlight UX (privacy prompt, fingerprint, cellular data) |

---

## 8. Exit Criteria (Decision Matrix)

```
        ┌─ D7 ≥ 30% → PASS (P2 gate met; go P3)
D7 rate ┤
        ├─ 20–29% → FIX LOOP (1–2 weeks; re-measure)
        └─ <20% → ESCALATE (pivot/kill decision; founder call)

Fix-loop candidates (if D7 ∈ 20–29%):
  1. Quiz difficulty (reduce by 1 tier; easier words)
  2. Paywall timing (move from 3-lesson to 10-lesson gate)
  3. Streak/social (add daily streak notification + week streak leaderboard)
  4. Onboarding UX (reduce O-4 diagnostic from 5 to 3 words)
```

---

**Owned docs:**
- [P2_RECRUITMENT_CHECKLIST.md](P2_RECRUITMENT_CHECKLIST.md) — TestFlight/Play setup, QA matrix, channel templates
- [RETENTION_DASHBOARD.md](RETENTION_DASHBOARD.md) — PostHog dashboard config, cohort + segment setup

---

*Last updated: 2026-05-31 — Full P2 beta plan including recruitment strategy, event definitions, measurement framework, diagnostics, timeline, and decision matrix. Retention gate D7 ≥ 30% is the single measurable exit criterion for Phase 2.*
