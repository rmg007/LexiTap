---
title: App Store Assets Strategy
status: in-progress
phase: P5 (pre-launch)
updated: 2026-05-31
---

# App Store Assets — Icon + Screenshots

**Goal:** iOS App Store + Google Play assets (icon, screenshots, copy) ready for store submission before P5 launch.

**Status:** Icon spec + screenshot list defined. Visual design deferred to P5 when app UI is fully stable (currently in cold-start state per `2026-05-31_ios_build_posthog_metro.md`).

---

## 1. App Icon Specification

**Deliverable files:**
- `website/assets/lexitap-icon-1024.png` (primary, 1024×1024 PNG)
- `website/assets/lexitap-icon-512.png` (secondary, 512×512)
- `website/assets/lexitap-icon-180.png` (iOS app store, 180×180)
- `website/assets/lexitap-icon-120.png` (iOS home screen, 120×120)

**Design direction:**
- **Shape:** Rounded square (radius ~15% of size)
- **Color:** Teal background (`#20B2AA` from tailwind.config.js), white text/accents (`#F2F5F6`)
- **Text:** Monogram "LT" in a clean sans-serif (SF Pro Display or system equivalent)
- **Spacing:** ~80px margin on 1024×1024 canvas
- **Inspiration:** Figure reference `.design-specs/images/style_guide.png` (confirm against live app theme)
- **Tone:** Minimal, professional, accessible (high contrast 7:1 WCAG AA pass)

**Rationale:**
- Teal + white matches the app's confirmed color scheme (tailwind tokens)
- Rounded square = modern iOS convention (Apple SF Symbols style)
- Monogram = simple, memorable, works at small sizes (favicon, home screen)

**Not in scope:**
- App name text in icon (breaks at <512px)
- Gradient (adds complexity, flat solid is more durable across iOS/Android)
- Complexity (avoids rendering issues on older devices)

---

## 2. App Store Screenshots

### Required count + dimensions

**iOS (App Store):**
- 5–7 screenshots (rule of thumb: show **5 core user flows**)
- Primary: 1170×2532 (iPhone 15 Pro Max at 3x scale)
- Fallback: 750×1334 (iPhone 8 at 2x scale)
- Format: PNG, max 40 MB each

**Android (Google Play):**
- 5–8 screenshots
- Primary: 1080×1920 (Pixel 6 portrait)
- Fallback: 1440×2560 (modern flagship)
- Format: PNG, max 8 MB each

### Screenshot list (5 core flows)

| # | Screen | Hook | Elements to show | Title (≤170 chars) |
|---|--------|------|-----|-----------------|
| 1 | **Quiz → Multiple Choice** | Lead with the differentiator | 4 options, teal highlight, green checkmark, no keyboard visible, question #/progress bar | No typing. Tap to answer. Instant feedback. |
| 2 | **Spaced Repetition** | Explains the mechanism | SRS interval label or "Next review" + streak counter | Studies what you forget. Skips what you know. |
| 3 | **Offline in action** | Key competitive advantage | App rendering without Wi-Fi, no connectivity indicator, stats/rings visible | No Wi-Fi needed. Download once, learn forever. |
| 4 | **TOEFL / IELTS focus** | Primary search intent | Exam-specific vocabulary, locked tier cards, "1000+ words per pack" | Exam-ready vocabulary. 1000+ words per pack. |
| 5 | **Paywall → Exam Packs** | Monetization + no-subscription | TOEFL/IELTS/Bundle cards with prices, "one-time" language, no "per month" visible | One-time purchase. Lifetime access. No subscriptions. |

**Optional 6th + 7th (if time):**
- 6: Knowledge Map (animated known/learning/new reveal)
- 7: Progress Rings (CEFR tier mastery visualization)

### Capture method

**Must use real simulator screenshots, NOT mockups:**

```bash
# iOS simulator
xcrun simctl screenshot booted /tmp/screen.png   # capture
open /tmp/screen.png                              # preview

# Android emulator
adb exec-out screencap -p > /tmp/screen.png      # capture
```

**Post-processing per screenshot:**
1. Crop to device-safe area (remove status bar / notch if needed for clarity)
2. Add transparent overlay text **above** the screenshot (not embedded in design)
   - Title text (bold, centered, ~24pt, white, drop-shadow)
   - Subheading (lighter, ~16pt, accent color teal)
3. Ensure text ≤170 characters per store rules
4. Final export: PNG, no compression artifacts

**Accessibility requirement:**
- Each screenshot title describes the feature (e.g., "Multiple choice quizzes with instant feedback")
- Not: decorative language like "Amazing Learning," "Boost Your Scores" (stores flag as marketing hype)
- Use app's **actual text content** where possible (in-app copy > marketing copy)

---

## 3. Store Listing Copy

**App name:** `LexiTap: TOEFL & IELTS Vocab` (29 chars — fits iOS 30-char limit)

**Subtitle/tagline (≤30 chars):**
```
No typing. Learn offline.
```

**Short description (≤80 chars):**
```
Vocabulary mastery through spaced repetition. Daily practice, real retention.
```

**Full description (≤4000 chars, line-broken for readability):**

```
LexiTap is an offline-first English vocabulary app for non-native speakers (ages 13+).

Learn smarter, not harder. Spaced repetition adapts to what you've forgotten—proven by 100 years of cognitive science to maximize retention.

Features:
• Offline learning—no internet required once downloaded
• Vocabulary across CEFR levels (A1–C1) and exam-specific packs (TOEFL, IELTS)
• Adaptive quizzes—multiple choice, no typing friction
• Track progress with visual rings and daily streaks
• One-time purchases—no subscriptions

Perfect for:
• Global English learners preparing for exams
• Students building core vocabulary
• Professionals improving workplace English

Download today. No ads. No subscription. One language, real fluency.
```

**Keywords:**
- Primary: ESL, vocabulary, English learning, spaced repetition
- Secondary: offline, TOEFL, IELTS, exam prep, CEFR levels
- Avoid: "AI," "ChatGPT," "unlimited," "guarantee," "fluent in 30 days"

**Support URL:** https://lexitap.app
**Privacy URL:** https://lexitap.app/privacy
**Terms URL:** https://lexitap.app/terms

---

## 4. Submission Checklist

### Before submitting to stores:

- [ ] Icon: 1024×1024 PNG, teal + white, rounded square, "LT" monogram
- [ ] iOS: 5+ screenshots at 1170×2532, simulator-captured, text overlays, <170 chars titles
- [ ] Android: 5+ screenshots at 1080×1920, same content, different layout
- [ ] App name + tagline in store listings
- [ ] Full description ≤4000 chars with feature bullets + use cases
- [ ] Keywords in store metadata
- [ ] Privacy + Terms links pointing to live lexitap.app URLs
- [ ] Screenshots reviewed for typos, brand voice (calm, not hype), accessibility (text describes, not just decorates)

### Timeline

- **P5 kickoff:** Finalize screenshots from real app (requires full onboarding + home + quiz + progress screens stable)
- **P5 M-1:** Bulk upload to stores (before 5–6 week review clock starts)
- **P5 launch:** Store approval complete

---

## 5. High-Risk Areas

**Tone mismatch:** Stores reward emotion (excitement, transformation claims). LexiTap's brand is calm + evidence-based. Do NOT overstate: "master English," "fluent in weeks," etc. Store rejects + user backlash if delivery doesn't match ads.

**Screenshot reflection of current state:** If screens show features NOT yet shipped (e.g., premium features if paywall isn't final), store approval + user reviews suffer. **Only screenshot shipped features.**

**Accessibility:** App is designed for non-native English speakers. Screenshot copy must be simple, jargon-free, readable. Avoid marketing platitudes ("Transform Your Life").

---

## 6. Files to Create/Update

| File | What | Status |
|------|------|--------|
| `mobile/assets/icon.png` | App icon (1024×1024) | ✅ Done |
| `mobile/assets/adaptive-icon.png` | Android adaptive foreground | ✅ Done |
| `website/assets/lexitap-icon-1024.png` | Icon 1024×1024 | ✅ Done |
| `website/assets/lexitap-icon-512.png` | Icon 512×512 | ✅ Done |
| `website/assets/lexitap-icon-180.png` | Icon 180×180 | ✅ Done |
| `website/assets/lexitap-icon-120.png` | Icon 120×120 | ✅ Done |
| `website/assets/ios-screenshot-{1..5}.png` | iOS screenshots | TODO (P5, after paywall + home finalized) |
| `website/assets/android-screenshot-{1..5}.png` | Android screenshots | TODO (P5, after UI stable) |
| Store metadata (Apple + Google) | Copy + keywords + screenshots | TODO (P5, via store dashboards) |

---

## 7. Design Debt + Known Issues

**Current app state (2026-05-31):**
- ✓ Onboarding flow (O-1 → O-5) renders on simulator
- ✓ Quiz + multiple choice screens in place
- ✓ Progress rings designed + tested
- ? Paywall final design TBD (in progress per RELEASE_PLAN)
- ? Home screen polish (streaks, "ready for today" final copy TBD)

**For P5:** Wait for final Paywall + Home designs before screenshotting (mismatched assets = thrashing in stores).

---

## References

- App color tokens: `mobile/tailwind.config.js` (teal #20B2AA, text #F2F5F6)
- Style guide reference: `.design-specs/images/style_guide.png`
- Onboarding flows: `lexitap-docs/03-screens/` (O-1 through O-5 specs)
- Quiz + progress: `lexitap-docs/03-screens/` (Q-1, P-1 specs)
- Paywall: `lexitap-docs/03-screens/paywall/` (pending final design per RELEASE_PLAN)
- Release plan: `plans/RELEASE_PLAN.md` (P5 milestone dates)

---

**Owner:** Ryan Gonzalez  
**Last updated:** 2026-05-31
