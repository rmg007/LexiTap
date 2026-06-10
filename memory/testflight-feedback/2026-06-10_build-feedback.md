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

## Fixed this session (commit pending)
- **Paywall safe-area**: header + ✕ dismiss now clear the status bar (`useSafeAreaInsets`, `paddingTop += insets.top`). Was a launch blocker on all notched iPhones (matches `2026-06-10_paywall-safe-area-bug.md`).
- **Paywall copy**: "Subscribe" → "Unlock" (button + a11y label + comments). These are one-time non-consumable IAPs — "Subscribe" risks Apple 3.1.1 rejection and the screen itself says "No subscriptions."

## Flagged — needs Ryan decision or device retest
- **Knowledge-map over-claim (#4)**: `estimateKnownCount` caps at pool size, so any `frontierRank ≥ pool` → "you know ALL 2,881 words, 0 new". Root cause = diagnostic frontier overshoot; needs on-device diagnostic retest, not a blind display hack. Endowed-progress screen should never show 100% known.
- **DOB full-date control (#1)**: age gate is legal-sensitive (LEGAL-2). Year-only is functionally enough to compute age, but tester wants full control. Decide: full native date picker vs. keep year-only + clearer copy.
- **Emoji-as-icons (#2/#4/#6)**: mobile app has NO Icon component — uses raw emoji (📚 📖 💼 🎓 📝). Violates Figma design-system "emoji 0 / Lucide" rule and looks unpolished in store screenshots. Needs an icon-system task (port Lucide → RN), not a one-line swap.
- **Version (#5)**, **paywall layout redesign (#6)**, **report redesign (#4)**, **diagnostic question types / separate JSON (#3)**: product/design calls → Figma + Ryan.
- **Diagnostic perception (#3)**: it IS already adaptive (DIAG-A band-walk) and the meaning-confirm step already requires submit; tester didn't perceive the count. Could add an honest "Question N" counter (no fixed denominator, since length is adaptive).
