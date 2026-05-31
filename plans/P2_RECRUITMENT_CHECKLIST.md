---
title: "P2 — Recruitment & QA Checklist"
status: active
phase: "P2"
updated: 2026-05-31
---

# P2 — Recruitment & QA Checklist

Operational runbook for beta launch: build setup, distribution, manual QA matrix, and tester feedback.

---

## Pre-Launch Checklist (Day -1)

### Build & Distribution Setup

- [ ] **TestFlight Build (iOS)**
  - [ ] Run `eas build --platform ios --profile beta` (or `production`, check which matches App Store signing cert)
  - [ ] Upload to App Store Connect
  - [ ] Set TestFlight testers to "External Testing" (not Internal)
  - [ ] Generate public link: `https://testflight.apple.com/join/...` and save to password manager / team wiki
  - [ ] Test link on personal device (should load without sign-in)
  - [ ] Verify build version matches `mobile/app.config.ts` `version` field (currently `0.1.0`)

- [ ] **Google Play Build (Android)**
  - [ ] Run `eas build --platform android --profile beta`
  - [ ] Upload to Play Console → Internal Testing track
  - [ ] Generate shareable link and save
  - [ ] Test link on Android device / emulator (should load)
  - [ ] Confirm package matches `app.config.ts` `name` field

- [ ] **EAS Secrets (PostHog)**
  - [ ] Verify `EXPO_PUBLIC_POSTHOG_API_KEY` is set in EAS project secrets (not in `.env`)
  - [ ] Confirm PostHog project is created + EU host is set
  - [ ] Test by building a local dev build and checking browser DevTools PostHog network calls (should POST to `eu.i.posthog.com`)

### App Configuration Validation

- [ ] **Onboarding Age Gate**
  - [ ] Confirm age gate is the first route after launch (`/onboarding/age`)
  - [ ] Test: select DOB <16 → should show error + stay on screen
  - [ ] Test: select DOB ≥16 → should advance to `/onboarding/welcome`

- [ ] **Content Availability**
  - [ ] Verify Foundation tier is marked `isActive: true` in `config/tiers.ts`
  - [ ] Confirm `words.db` is bundled in iOS + Android builds (check Xcode / Android Studio build logs for "embedded database")
  - [ ] Test on simulator: Home screen should load; quiz should show real words (not empty)

- [ ] **Analytics Wiring**
  - [ ] Confirm no `console.log` errors on app startup (check Metro/Android Studio logs)
  - [ ] On first launch, PostHog should receive `session_started` event (check PostHog Events table)
  - [ ] Event payload should have `distinct_id` (anon_id UUID), no email/token/PII

- [ ] **Sentry Crash Monitoring**
  - [ ] Verify `SENTRY_AUTH_TOKEN` is set in EAS secrets
  - [ ] Confirm Sentry project is created in Sentry.io dashboard
  - [ ] Test by triggering an intentional crash (e.g., `throw new Error("test")` in Home, build, run on device, catch error)
  - [ ] Check Sentry dashboard — should see error with PII-scrubbed breadcrumbs (no emails/IPs/tokens)

### Tester Feedback Channel

- [ ] **Create feedback collection**
  - [ ] Option A: Discord channel `#beta-feedback` (invite-only, link in description)
  - [ ] Option B: Email alias `beta-feedback@lexitap.app` (forward to ryan@)
  - [ ] Option C: Google Form (quick 3-question form: "What's your goal?", "What broke?", "Would you use this daily?")

- [ ] **Pin bug report template in channel:**
  ```
  🐛 BUG REPORT
  Device: [iPhone 13 / Pixel 6 / etc.]
  OS: [iOS 17.2 / Android 14 / etc.]
  Steps to reproduce:
    1.
    2.
    3.
  Expected: 
  Actual:
  Screenshots: [if possible]
  ```

- [ ] **Create shared doc for feature requests / feedback** (Google Doc or Notion for synthesis; share read-only link in channel)

---

## Recruitment & Launch (Day 0)

### Channel Distribution

Post links to all channels simultaneously (or stagger by 4–6 hours to manage initial surge):

- [ ] **Reddit r/EnglishLearning** (mod approval may take 1–2 days)
  ```
  Title: "Recruiting beta testers for LexiTap — free offline ESL vocab app"
  Post: 
  LexiTap is a new offline vocabulary app for non-native English learners.
  It uses spaced-repetition to help you master 3000+ words efficiently.
  
  🎯 We're recruiting 50–100 testers for closed beta (1–4 weeks).
  Completely free. iOS (TestFlight) + Android (Play internal test).
  
  What's included:
  • Foundation vocabulary (2800+ words)
  • Adaptive spacing algorithm (SRS)
  • Offline-first (no WiFi needed)
  
  If you're interested, reply below or use the link:
  [TestFlight link]
  [Play internal test link]
  
  We'll be reading feedback closely and shipping updates daily.
  Questions? Email beta-feedback@lexitap.app
  ```

- [ ] **Discord communities** (LingoStorm, Polyglot, language exchange servers)
  ```
  🆕 LexiTap Beta — Free Offline ESL Vocabulary App
  
  Join 50+ testers in our beta! 
  • Master 2800+ vocabulary words
  • Spaced-repetition algorithm (proven retention)
  • Completely offline (no ads, no WiFi needed)
  • iOS + Android
  
  Sign up:
  [TestFlight link]
  [Play link]
  
  Give feedback in #beta-feedback. First 50 testers get prioritized support.
  ```

- [ ] **Slack language-learning communities** (TechWriters ESL, ESL coaches, TOEFL Slack, etc.)
  Post in #announcements or DM directly (if permitted).

- [ ] **Email (personal network)**
  - [ ] Send BCC to 10–20 contacts (language teachers, fellow learners, student networks)
  - [ ] Subject: "Try LexiTap — free offline vocab app (beta)"
  - [ ] Body: 2–3 sentences + links + feedback channel

- [ ] **Twitter / Bluesky**
  ```
  🎉 Launching LexiTap beta this week!
  
  Offline ESL vocabulary app. Spaced-repetition for real retention.
  Join 50+ testers → help shape the app → get early access.
  
  iOS: [TF link]
  Android: [Play link]
  
  We ship daily based on feedback. #ESL #English #Language
  ```

### Day 0 Monitoring

- [ ] **Monitor signup velocity** (target: 3–5 installs/day for first 3 days)
  - [ ] Check TestFlight dashboard (testers count)
  - [ ] Check Play Console dashboard (installs count)
  - [ ] Check PostHog Events table (distinct_id count; should match installs)

- [ ] **Sample 3 devices immediately** (iOS + Android) to verify:
  - [ ] App launches (no blank screen)
  - [ ] Age gate renders
  - [ ] First-session analytics event fires (check PostHog)

---

## Week 1 QA Matrix (Days 1–7)

### Manual QA — Device Coverage

Run this matrix on **3–5 real devices** (iOS + Android); repeat whenever a fix ships.

| Phase | Test | Device | Pass criteria |
|-------|------|--------|---|
| **Launch** | Cold start (app never opened before) | iPhone 12, iPhone 14, Pixel 5 | App loads in <5s; no crashes in Sentry |
| **Age Gate** | Enter DOB <16 | Any | Error message shown; cannot proceed |
| **Age Gate** | Enter DOB ≥16 | Any | Advances to Welcome screen |
| **Onboarding Goal** | Select goal (exam/professional/general) | Any | Selection persists; O-2 completes |
| **Onboarding Diagnostic** | Complete 5-word stride sampler | Any | Frontier-rank computed; O-4 completes |
| **Knowledge Map Reveal** | View endowed-progress bar | Any | Bar renders; "You know ~X words" copy displays |
| **Home** | View progress, daily goal | Any | Progress bar not hardcoded (should reflect diagnostic frontier) |
| **First Quiz** | Start quiz from Home, complete 3 words | Any | Quiz words load; can swipe through; results saved |
| **Streak Display** | Complete 1–2 more quizzes (same day) | Any | Streak increments; badge renders |
| **Offline** | Kill WiFi, restart app, attempt quiz | Any | Quiz still loads (cached words); can play offline |
| **Connectivity Restore** | Re-enable WiFi after quiz | Any | Analytics events eventually flush to PostHog (within 30s of restore) |
| **Session Persistence** | Kill app (force-close), restart | Any | Progress preserved; streak persists; no duplicate events in PostHog |
| **Crash Recovery** | Intentionally crash app (e.g., button → throw) | Any | Sentry captures error; app restart is clean (no repeated crashes) |

**Log:** For each device/test combo, record:
- ✅ Pass (no issues)
- ⚠️ Warn (minor UX friction, e.g., slow load, button not obvious)
- ❌ Fail (crash, wrong behavior, data loss)

Document all ❌/⚠️ in Sentry / feedback channel immediately.

### Manual QA — Specific Fragile Areas

Test these per every build (they break easily):

| Area | Test | Pass criteria |
|------|------|---|
| **Database Attachment** | First quiz loads ≥40 Foundation words | SQL ATTACH path is correct; no "unable to open database" errors in Sentry |
| **SRS State** | Complete quiz → revisit Home; revisit quiz. | Last quiz result is cached; SRS scheduling is deterministic (same word prioritized next time) |
| **Onboarding Persistence** | Complete O-1…O-5, kill app, restart. | Goal + band + frontier-rank are in AsyncStorage; O-1…O-5 do not repeat |
| **PostHog Events** | Complete full onboarding + quiz; check PostHog. | At least 6 events in PostHog: `session_started`, `lesson_completed` (3×), `streak_event`, `session_completed` |
| **Sentry PII Scrub** | Check Sentry for any build that shipped Sentry DSN. | Breadcrumbs must NOT contain: email, Supabase ID, API token, device name, IP address |
| **Metro/Build** | Fresh `npm run check`, then `eas build` | No Babel errors (NativeWind preset must be in `presets`, not `plugins`); no Metro `@@typeof` errors |

### Feedback Synthesis (Days 2–7)

- [ ] **Daily check** of feedback channel / email (10 min review)
  - [ ] Categorize: crash | feature request | content error | UX friction
  - [ ] Escalate crashes to Sentry investigation
  - [ ] Log common themes (e.g., "3 people say 'X word's definition is wrong'")

- [ ] **Create feedback summary** by EOD Day 7:
  - [ ] 1–2 page doc: top 10 issues + frequency + assigned severity
  - [ ] Identify hotfix candidates (1-hour fixes that unblock >5 testers)

---

## Hotfix Cycle (Days 2–7, if needed)

If ≥3 testers report the same crash or blocker:

- [ ] **Identify root cause** (Sentry stack trace)
- [ ] **Fix in code** + run `npm run check` (ensure no regressions)
- [ ] **Rebuild via EAS** (`eas build --platform ios --profile beta`)
- [ ] **Deploy to TestFlight** (upload to App Store Connect)
- [ ] **Re-announce in feedback channel:** "Fix for X is live; please reinstall and retest"
- [ ] **Monitor Sentry** for regression

**Typical hotfix cadence:** 1–2 per week (not daily; batching is OK unless it's a critical crash).

---

## Retention Data Harvest (Days 8–14)

### PostHog Cohort Extraction

By Day 8, compute:

- [ ] **D1 cohort:** Users with `session_started` event on install day (day 0)
  - Query: `select count(distinct_id) where event='session_started' and day=0`
  - Expected: 50–70
  - Document count + date range

- [ ] **D7 cohort:** Subset of D1 with ≥1 event on day 7 (±1 to account for timezones)
  - Query: `select count(distinct distinct_id where day=7) from D1 cohort`
  - Compute rate: (D7 count) / (D1 count)
  - Expected: ≥30%

- [ ] **D30 cohort:** (For reference; not the gate yet)
  - Query: Similar, but day=30
  - Expect lower (baseline for future phases)

### Segment Breakdown

For each segment, recompute D7 retention:

- [ ] **By onboarding goal:** `select goal, count(d7_users) / count(d1_users) group by goal`
  - Expected: exam seekers >35%, general learners >25%

- [ ] **By platform:** iOS vs Android
  - Expected: <10% variance (if >15%, debug platform-specific crash)

- [ ] **By first-session duration:** Users with session_duration ≥5min vs <2min
  - Expected: ≥5min users have 40%+ D7; <2min users <20%

### Funnel Slicing

- [ ] **Onboarding completion:** (users reaching Home) / (users opening app)
  - Expected: ≥85%

- [ ] **Quiz attempt within 24h:** (users with ≥1 `lesson_completed`) / (users at Home)
  - Expected: ≥70%

- [ ] **Per-quiz completion:** (users completing quiz) / (users starting quiz)
  - Expected: ≥80%

### Report Generation (Day 10–12)

- [ ] **Create D7 Retention Report** (3–5 page markdown):
  - [ ] Executive summary: "D7 = 32%, gate PASS" or "D7 = 18%, gate FAIL"
  - [ ] Cohort counts + dates (proof of statistical validity)
  - [ ] Segment breakdown (goal/platform/duration)
  - [ ] Funnel analysis (where do testers drop off?)
  - [ ] Top 5 bugs + fixes shipped (if any)
  - [ ] Top 3 feature requests (defer to P3 roadmap)
  - [ ] 1–2 recommendations for P3

- [ ] **Archive cohort definition** in memory/ for reference (so P6 growth can compare "early adopter D7" vs "mainstream D7")

---

## Decision Gate (Day 14)

### Meeting Agenda

Time: 30 min
Attendees: Ryan (founder), analyst (if available)

1. **Review D7 metric** (5 min)
   - D7 rate + confidence interval
   - Sample size validation (≥40 users = good; <20 = noisy)

2. **Review segment analysis** (5 min)
   - Which segments performed best/worst?
   - Any platform crashes?

3. **Review feedback themes** (5 min)
   - Top 3 bugs + did they impact cohort?
   - Feature requests (log, don't implement)

4. **Decision** (15 min)
   - **D7 ≥ 30%** → Declare gate passed; proceed to P3
   - **20–29%** → Identify 1–2 fixes; commit to re-measure week 3
   - **<20%** → Assess pivot: is this a content/UX problem, or product-market fit issue?

### Go / No-Go Criteria

| Outcome | Action |
|---|---|
| **D7 ≥ 30%** | Close P2; start P3 sprint (A0, R1–R7, AU1–AU3) |
| **20–29% + fixable** | Deploy hotfix; extend beta 7–10 days; re-measure D7 on day 21 |
| **20–29% + not fixable** | Pivot decision: cut feature (e.g., remove paywall blocker, simplify onboarding) and re-measure, OR defer to post-launch and begin P3 with known UX debt |
| **<20%** | Escalate: convene product meeting with founder. Options: (a) extend beta + 2-week fix cycle, (b) defer P2 retention measurement to post-launch (launch with known churn), or (c) abandon beta entirely and soft-launch to 1000-user cohort in P6 |

---

## Documentation Rollover

Upon gate decision (pass or re-run), save:

- [ ] **Feedback doc** → commit to `memory/` as `{date}_p2_beta_feedback.md` (tester comments, themes, feature requests)
- [ ] **Cohort data** → save PostHog export (CSV or JSON) to `memory/` with cohort definition
- [ ] **QA findings** → commit manual QA matrix + hotfix changelog to `memory/` as `{date}_p2_qa_matrix.md`
- [ ] **Decision memo** → add meeting notes to `memory/` as `{date}_p2_gate_decision.md` (decision made, rationale, next phase)

---

**Linked docs:**
- [P2_BETA_PLAN.md](P2_BETA_PLAN.md) — Full measurement framework, diagnostics, exit criteria
- [RETENTION_DASHBOARD.md](RETENTION_DASHBOARD.md) — PostHog dashboard config

---

*Last updated: 2026-05-31 — Pre-launch checklist (build setup, feedback channel, analytics validation), Week 1 manual QA matrix, hotfix cycle, Week 2 retention harvest, Day 14 decision gate, and documentation rollover.*
