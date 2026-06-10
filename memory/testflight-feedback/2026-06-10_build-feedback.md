# TestFlight Tester Feedback — pulled 2026-06-10

Source: App Store Connect API (`betaFeedbackScreenshotSubmissions`), app `6775245619` (com.lexitap.app).
Tester: **mhalim80@hotmail.com** — iPhone 14,3 (iPhone 13 Pro), iOS 26.5. 6 screenshot submissions, **0 crashes**.
Screenshots saved alongside this file (CDN URLs expired 2026-06-15).

| # | Screen | Verbatim comment | Verdict |
|---|--------|------------------|---------|
| 1 | Age gate (`01_dob.jpg`) | "I can't change the date of birth." | **BUG** — only "Change year" exists; month/day locked. |
| 2 | Goal select (`02_benefit.jpg`) | "I don't understand the benefit of this screen. How does my choice affect my learning path?" | UX/product — value not communicated; also emoji icons. |
| 3 | Diagnostic (`03_diagnostic.jpg`) | Wants: question count (total/left/answered); submit-on-select; increasing difficulty; questions in separate JSON; diverse question types; distinctive headers. | Mixed — some already implemented (adaptive), some product calls. |
| 4 | Knowledge map (`04_report.jpg`) | "This looks very bad report... students will run away." | **BUG + design** — bar shows 100% known (~2,881 = entire pool, 0 new). Over-claim. |
| 5 | Version (`01_dob` set) | "The version should be 0.0.1" | Opinion — 0.1.0 is valid; Ryan's call. |
| 6 | Paywall (`05_paywall.jpg`) | "Don't understand how this design was approved... categories not visible... one row per category w/ price + subscribe button." | **BUG + design** — header/✕ overlap status bar; "Subscribe" wrong word; emoji icons. |

## FIXED + committed (`990abbd`, `07e5c65` — pushed to main)
- **DOB full date picker (#1)** — `OnboardingAgeGateScreen` rebuilt: three scrollable `PickerColumn`s (Month / Day / Year), `daysInMonth()` clamps day on month/year change, no `TextInput` (passive-recognition invariant held). Replaced the year-only clipped control. Render tests updated (toggle removed).
- **Paywall safe-area (#6)** — header + close button now clear the status bar (`useSafeAreaInsets`, `paddingTop += insets.top`). Was a launch blocker on all notched iPhones (matches `2026-06-10_paywall-safe-area-bug.md`).
- **Paywall copy (#6)** — "Subscribe" → "Unlock" (button + a11y label + comments). One-time non-consumable IAPs — "Subscribe" risks Apple 3.1.1 rejection and the screen itself says "No subscriptions."
- **Icon system / emoji removal (#2/#4/#6)** — NEW `Icon.tsx` (lean hand-curated Lucide registry, `react-native-svg`). Swept **all** emoji out of the app UI: goal-selection, paywall, StreakBadge, MultipleChoice, FeedbackLayer, SessionComplete, LearnQuickCheck, ForgivenessSheet, LearnCard ("♪"→"Listen"). Verified zero emoji remain in non-test `mobile/src` + `mobile/app`.
- **Emoji now a HARD RULE** — `guardrails.mjs` PreToolUse hook hard-blocks emoji in mobile UI source (pictographic ranges only; `→ ↔ ─` comment chars exempt). Documented in CLAUDE.md (two tables). Self-tested 5 cases.

## ⚠️ Ships to device ONLY after a NEW EAS build
`react-native-svg` is a **native module** — the Icon system + DOB picker will NOT appear in the current TestFlight build until rebuilt. JS-only EAS Update is insufficient. Run `cd mobile && eas build --platform ios --profile beta --auto-submit` (Ryan's call / device step).

## Still flagged — needs Ryan decision or device retest (NOT code-fixable now)
- **Knowledge-map over-claim (#4)**: `estimateKnownCount` caps at pool size, so any `frontierRank ≥ pool` → "you know ALL ~2,881 words, 0 new". Root cause = diagnostic frontier overshoot; needs on-device diagnostic retest, not a blind display hack. Endowed-progress screen should never show 100% known.
- **Version (#5)**, **paywall layout redesign (#6)**, **report redesign (#4)**, **diagnostic question types / separate JSON (#3)**: product/design calls → Figma + Ryan.
- **Diagnostic perception (#3)**: it IS already adaptive (DIAG-A band-walk) and the meaning-confirm step already requires submit; tester didn't perceive the count. Could add an honest "Question N" counter (no fixed denominator, since length is adaptive).
