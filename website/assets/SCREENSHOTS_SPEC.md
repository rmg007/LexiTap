# App Store Screenshots Specification

## Overview

LexiTap app store screenshots must reflect **real app state** (simulator captures, not mockups). This spec defines what each of the 5 core screenshots should show, the copy overlay, and capture method.

---

## iOS Screenshots (5–7 images)

**Format:** PNG, 1170×2532 (iPhone 15 Pro Max at 3x), or 750×1334 (iPhone 8 at 2x)  
**Title/overlay:** Plain white text, left-aligned or centered, max 170 characters per store rules  
**Naming:** `ios-screenshot-1.png` through `ios-screenshot-N.png`

### Screenshot 1: Quiz → Multiple Choice (lead with the differentiator)

**What to show:**
- Quiz in progress: English word or phrase being quizzed
- 4 multiple-choice options (one highlighted/selected in teal)
- Immediate feedback state (green checkmark visible)
- Question number (e.g., "3 of 10") + progress bar
- Large, readable text (non-native speaker POV, no keyboard anywhere)

**Title overlay:**
```
No typing. Tap to answer. Instant feedback.
```

**Subtitle (optional):**
```
Multiple choice quizzes. Zero keyboard stress.
```

**Why this screen:**
- Leads with the #1 UX differentiator: no typing friction
- Immediately distinguishes LexiTap from Duolingo/Quizlet typing flows
- Non-native speakers see themselves getting answers — low anxiety

---

### Screenshot 2: Spaced Repetition in Action

**What to show:**
- Quiz or review card showing SRS context ("See you in 3 days" / interval label)
- OR: home screen with "Next review: tomorrow" messaging
- Streak counter visible (daily habit signal)
- Teal color scheme prominent

**Title overlay:**
```
Studies what you forget. Skips what you know.
```

**Subtitle (optional):**
```
Proven by 100 years of cognitive science.
```

**Why this screen:**
- Explains the mechanism without jargon (skips what you know = no wasted time)
- "100 years of cognitive science" = credibility for serious learners
- Differentiates from rote flashcard apps

---

### Screenshot 3: Offline — No Wi-Fi Required

**What to show:**
- App actively in use (quiz or home screen) with no connectivity indicator
- OR: a visual showing "Offline" badge / airplane-mode state
- Progress rings or stats visible (proving real content works offline)

**Title overlay:**
```
No Wi-Fi needed. Download once, learn forever.
```

**Subtitle (optional):**
```
No data plan, no interruptions.
```

**Why this screen:**
- Core competitive advantage for global learners (unreliable internet markets)
- Directly addresses a real user fear ("will it work without Wi-Fi?")
- "Download once, learn forever" echoes the one-time purchase model

---

### Screenshot 4: TOEFL / IELTS Exam Focus

**What to show:**
- Quiz screen specifically showing TOEFL or IELTS tier content
- OR: locked tier cards for TOEFL/IELTS packs with unlock CTA
- Content that's clearly exam-specific (academic vocabulary, formal register)
- Teal "locked" vs "unlocked" visual contrast

**Title overlay:**
```
Exam-ready vocabulary. 1000+ words per pack.
```

**Subtitle (optional):**
```
TOEFL, IELTS, GRE, GMAT, Business English.
```

**Why this screen:**
- Directly targets the primary search intent (TOEFL vocabulary, IELTS vocab)
- Shows breadth of exam coverage (5 packs)
- Specific word count = credible promise vs vague "thousands of words"

---

### Screenshot 5: Paywall → One-Time Purchase

**What to show:**
- Paywall with exam pack cards:
  - **TOEFL** — $9.99
  - **IELTS** — $9.99
  - **All-Exams Bundle** — $29.99
- Feature bullets: "1000+ exam-specific words", "Lifetime access (one-time)"
- CTA buttons ("Unlock" or "Buy Now")
- No subscription language anywhere — absence of "per month" is itself a signal

**Title overlay:**
```
One-time purchase. Lifetime access. No subscriptions.
```

**Subtitle (optional):**
```
Ace your English exams with focused vocabulary.
```

**Why this screen:**
- Converts the monetization anxiety into a selling point: no subscription trap
- Price transparency builds trust with deal-conscious international learners

---

### Optional: Screenshot 6 (Knowledge Map Reveal)

**What to show:**
- Knowledge Map animated reveal: Known / Learning / New segments
- Endowed progress copy ("You already know ~X words")
- "Start learning" CTA

**Title:**
```
See what you know. Plan what's next.
```

---

### Optional: Screenshot 7 (Progress Rings)

**What to show:**
- Concentric CEFR rings (A1–C1), color-filled by % mastered
- Legend: "20/100 words mastered in A1"
- Total words mastered stat

**Title:**
```
Watch your knowledge grow. Tier by tier.
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
