# App Store Screenshots Specification

## Overview

LexiTap app store screenshots must reflect **real app state** (simulator captures, not mockups). This spec defines what each of the 5 core screenshots should show, the copy overlay, and capture method.

---

## iOS Screenshots (5–7 images)

**Format:** PNG, 1170×2532 (iPhone 15 Pro Max at 3x), or 750×1334 (iPhone 8 at 2x)  
**Title/overlay:** Plain white text, left-aligned or centered, max 170 characters per store rules  
**Naming:** `ios-screenshot-1.png` through `ios-screenshot-N.png`

### Screenshot 1: Welcome + Age Gate

**What to show:**
- Age gate confirmation (if still in onboarding flow)
- Welcome screen with LexiTap logo + tagline
- "Get Started" or equivalent CTA button
- Dark theme with teal accents visible

**Title overlay:**
```
Get English right. Start today.
```

**Subtitle (optional):**
```
Vocabulary through spaced repetition.
```

**Why this screen:**
- First impression: greet the user, show brand identity
- Trust signal: age gate confirms app is for 13+ learners

---

### Screenshot 2: Home → Ready for Today + Streak

**What to show:**
- Home screen with date + greeting ("Welcome back, [Name]" if applicable)
- Quiz card(s) showing:
  - Topic (e.g., "Science," "Daily Vocab")
  - Difficulty level (e.g., "Intermediate")
  - "Start Quiz" CTA
- Visible streak counter (days, fire icon)
- Progress summary (e.g., "Ready for today's lesson")
- Teal color scheme prominent

**Title overlay:**
```
Learn a little every day. Build your streak.
```

**Subtitle (optional):**
```
Consistent practice beats cramming.
```

**Why this screen:**
- Hook: daily habit motivation
- Shows engagement mechanism (streaks, progress)

---

### Screenshot 3: Quiz in Progress → Multiple Choice

**What to show:**
- Quiz header with current question number (e.g., "3 of 10")
- English word or phrase being quizzed
- 4 multiple-choice options:
  - One option **highlighted/selected** (teal background or border)
  - Show the feedback state (green checkmark or red X if answer shown)
- Word definition or image clue (if shown in quiz)
- Progress bar at bottom (optional)
- Visual hierarchy: large, readable text (non-native speaker POV)

**Title overlay:**
```
Multiple choice. No typing stress. Instant feedback.
```

**Subtitle (optional):**
```
See the right answer immediately.
```

**Why this screen:**
- Core UX: zero friction learning (no keyboard, no guessing)
- Accessibility: shows answer immediately (confidence boost)

---

### Screenshot 4: Progress Dashboard → Mastery Rings

**What to show:**
- Concentric progress rings representing CEFR levels:
  - A1 (innermost, darkest teal)
  - A2
  - B1
  - B2
  - C1 (outermost, brightest or less-filled)
- Each ring color-filled proportional to % words mastered in that tier
- Legend showing "20/100 words mastered in A1" style text
- Optional: animated state (if possible to screenshot)
- Total words mastered stat (e.g., "342 words mastered")

**Title overlay:**
```
Watch your knowledge grow. See growth across levels.
```

**Subtitle (optional):**
```
Master English vocabulary tier by tier.
```

**Why this screen:**
- Hook: intrinsic motivation (visual progress)
- Shows app's grading system (CEFR—credible to teachers)

---

### Screenshot 5: Paywall → Exam Packs (Premium)

**What to show:**
- Paywall headline (e.g., "Unlock Exam Prep")
- Card(s) showing available exam packs:
  - **TOEFL Mastery** — $9.99 (1000+ words specific to TOEFL)
  - **IELTS Mastery** — $9.99 (1000+ words specific to IELTS)
  - **All-Exams Bundle** — $29.99 (both + future packs)
- Feature bullets under each:
  - "1000+ exam-specific words"
  - "Full pronunciation audio"
  - "Lifetime access (one-time purchase)"
- CTA buttons ("Unlock" or "Buy Now")
- Teal theme, professional tone (not salesy)

**Title overlay:**
```
One-time purchase. Lifetime access. No subscriptions.
```

**Subtitle (optional):**
```
Ace your English exams with focused vocabulary.
```

**Why this screen:**
- Monetization + perceived value
- Reassures user: no subscription trap ("one-time")

---

### Optional: Screenshot 6 (Progress Summary)

**What to show:**
- Settings / Profile page (if designed)
- User stats: total words learned, current streak, mastery level
- Optional: about, privacy/terms links, logout

**Title:**
```
Track your stats. Own your progress.
```

---

### Optional: Screenshot 7 (Knowledge Map Reveal)

**What to show:**
- Knowledge Map screen showing animated reveal of:
  - Known words (green)
  - Learning words (yellow/amber)
  - New words (grey)
- Segment labels with counts
- "Start learning" CTA linking to quiz

**Title:**
```
See what you know. Plan what's next.
```

---

## Android Screenshots (5–8 images)

**Format:** PNG, 1080×1920 (Pixel 6) or 1440×2560 (modern flagship)  
**Title/overlay:** Same as iOS, adjusted for portrait aspect ratio (slightly taller device)  
**Naming:** `android-screenshot-1.png` through `android-screenshot-N.png`

**Content:** Same 5 flows as iOS, but ensure:
- Text overlay does NOT obscure on-screen buttons
- Account for system nav bar at bottom (Android nav buttons)
- Adjust text placement if needed for taller screens

---

## How to Capture Screenshots

### iOS Simulator

```bash
# List booted simulators
xcrun simctl list devices available | grep "Booted"

# Capture single screen
xcrun simctl screenshot booted ~/Desktop/ios-screenshot-1.png

# Open preview
open ~/Desktop/ios-screenshot-1.png

# Batch capture (navigate app, run this each time)
for i in {1..5}; do
  echo "Capture screenshot $i, then press Enter..."
  read
  xcrun simctl screenshot booted ~/Desktop/ios-screenshot-$i.png
done
```

### Android Emulator

```bash
# List running emulators
adb devices

# Capture single screen (output to host)
adb exec-out screencap -p > ~/Desktop/android-screenshot-1.png

# Or save to device, then pull
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png ~/Desktop/android-screenshot-1.png
```

---

## Post-Processing Checklist

For each screenshot:

- [ ] Crop to device safe area (remove status bar if needed for clarity)
- [ ] Resize to store-compliant dimensions:
  - iOS: 1170×2532 or 750×1334
  - Android: 1080×1920 or 1440×2560
- [ ] Add text overlay:
  - **Title** (bold, white, drop-shadow for readability)
  - Position: top-left or top-center (avoid overlapping UI)
  - Font size: ~48–60px for title, ~36px for subtitle
  - Max 170 characters for title per store rules
- [ ] Check for:
  - No typos in copy
  - Teal branding visible (#20B2AA)
  - Dark theme consistent throughout
  - All text readable (high contrast 7:1 WCAG AA minimum)
  - No debug info, console logs, or simulator artifacts visible
- [ ] Export as PNG (no JPG; PNG allows transparency + text overlay)
- [ ] File size: <40 MB per iOS store rules, <8 MB per Google Play (shouldn't exceed either)

---

## Tone Guidelines

### DO:
- ✓ Use **active voice, benefit-focused** language ("Learn a little every day")
- ✓ Show **calm confidence** (app is capable, user is in control)
- ✓ Highlight **app-specific UX** (multiple choice, no typing, instant feedback)
- ✓ Use **actual in-app text** as copy (not marketing jargon)
- ✓ Include **credible facts** (spaced repetition, CEFR levels, lifetime access)

### DON'T:
- ✗ Overstate results ("Fluent in 30 days," "Master English," "Transform your life")
- ✗ Use marketing clichés ("Unlock your potential," "Boost your scores")
- ✗ Make unsubstantiated claims ("AI-powered," "Proven results")
- ✗ Hide monetization (be transparent: "one-time purchase," price visible)
- ✗ Feature screenshots of features NOT shipped (store rejection + user backlash)

**Reason:** LexiTap's audience = serious learners (exam prep, career). They distrust hype and value **evidence** (CEFR, spaced repetition, offline, no ads). Store stores also reject marketing hyperbole; authenticity scores better.

---

## Final Checklist Before Store Submission

- [ ] All 5+ screenshots captured from **real simulator**, not mockups
- [ ] Screenshots show features that are **fully shipped** (no "coming soon")
- [ ] Paywall design **finalized** (if showing premium features)
- [ ] Home screen copy **finalized** (streak label, button text, etc.)
- [ ] All overlaid text **reviewed for typos + tone**
- [ ] Privacy + Terms URLs point to **live lexitap.app pages**
- [ ] Icon (1024×1024) **created and tested** at smaller sizes
- [ ] Store copy (tagline, description, keywords) **approved**
- [ ] Screenshots **cropped consistently** (same text position/size across all)

---

**Last updated:** 2026-05-31  
**Reference:** `plans/ASSET_STRATEGY.md`
