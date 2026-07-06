---
name: store-screenshots
description: >-
  Turn raw LexiTap iPhone simulator screenshots into premium, launch-ready App
  Store screenshot decks with deterministic Playwright rendering. Use when
  creating, revising, or critiquing LexiTap's store screenshots, or choosing
  slide strategy for the App Store listing. Renders iPhone sizes today; iPad
  or Android tablet export needs a new device profile + frame asset first
  (LexiTap is iOS-first per CLAUDE.md — Android is on hold, don't build it).
  Produces three visual directions, exact-size PNGs, and an HTML showcase for
  review. Ports from `~/Desktop/playwright-framer`, customized to LexiTap's
  brand and the 6 shots defined in `website/assets/SCREENSHOTS_SPEC.md`.
---

# LexiTap Store Screenshots

## What this is

A tiny, self-contained Node script that composes raw simulator screenshots
into marketing-first App Store screenshots (headline + eyebrow + framed
device on a designed canvas) and renders them with Playwright at exact native
dimensions. Use it when you want reproducible output and precise typography
instead of a GUI editor. Keep the deck phone-first — LexiTap has no tablet UI.

**Why not a GUI editor?** Use this when deterministic browser rendering and
high-fidelity typography matter more than drag-tweaking layout in a browser.

**This skill is asset tooling, not app source.** It does not live in
`mobile/` or `content-tool/` and is never subject to their lint/typecheck/test
gates — see Setup for where the working copy goes.

## Current coverage

Ships ready for **iPhone App Store screenshots only.** The render engine is
device-data-driven (it reads `devices[deck.device]` from `devices.json`), but
the template ships exactly one profile — `iphone` — one iPhone bezel asset,
and the bezel CSS aspect ratio (`1022/2082`, in `render.mjs`) is
iPhone-specific. LexiTap is iOS-first with Android explicitly on hold (see
CLAUDE.md) — **do not add an Android/Play profile without Ryan's go-ahead**,
that is a product-scope decision, not a rendering one.

If Android ever ships and screenshots are needed:
1. Add a device profile (`sizes` + `screenInset` + `bezel`) to `devices.json`.
2. Drop a matching frame PNG into `frames/` and re-measure its `screenInset`.
3. Parameterize the bezel aspect ratio in `render.mjs` (hardcoded to the
   iPhone frame today), or render `--treatment frameless`, which has no bezel.

## Source of truth for content

**`website/assets/SCREENSHOTS_SPEC.md` is canonical** for which 6 screens to
capture, what each should show, and the sell-copy rationale. The bundled
`deck.example.json` already encodes those 6 slides (headlines trimmed to the
copywriting rules below — the spec's longer title/subtitle pairs are folded
into one short headline per slide). If the spec changes, update it first,
then re-sync `deck.json`'s headlines to match — don't let them drift.

The 6 slides, in order:

1. **No typing** (`device-bottom`) — multiple-choice quiz, no keyboard, one
   option selected. The #1 differentiator vs. Duolingo/Quizlet typing flows.
2. **Spaced repetition** (`device-top`) — SRS interval label or streak
   counter. Explains the mechanism without jargon.
3. **Works offline** (`device-bottom`) — app in active use, no connectivity
   indicator. Core competitive edge for learners on unreliable data plans.
4. **Exam-ready** (`device-top`, with a `callout`) — TOEFL/IELTS/GRE tier
   content or locked/unlocked pack cards. Targets the highest-intent search
   terms.
5. **One-time purchase** (`device-bottom`) — paywall showing exam pack cards
   and prices, zero subscription language.
6. **Knowledge Map** (`device-top`) — onboarding reveal (Known/Learning/New
   segments). Closes on "you already know more than you think."

A 7th (Progress Rings / CEFR tiers) is documented in the spec as optional —
add it only if a 7-slide set earns its place; don't pad to hit a number.

## Creative directions

Render all three directions when the user wants top-tier screenshots:

- `classic`: dark premium canvas (LexiTap's near-black `bgBase`), centered
  composition, restrained teal glow, serif headline, product UI as the focus.
- `fancy`: a dimensional editorial concept — light ivory material surface,
  left-aligned serif headline, angled devices, richer shadows, and two crisp
  brand ribbons for depth. More energetic; still fully on-brand.
- `bold`: poster contrast — heavy grotesk type in uppercase, a solid
  streak-orange eyebrow chip, tilted device with an offset "sticker" shadow,
  diagonal accent band. Loudest of the three; best for standing out in the
  crowded Education category search results.

**All directions drive ALL colors from `deck.theme`**, so rebranding the
palette rebrands every direction. Do not hardcode colors in the CSS — read
them from the theme vars (`${t.navy}` etc.) or they will drift off-brand.

Render all three first, show `out/index.html`, then let the user choose the
direction before over-polishing. Do not ask the user to choose from words alone.

## Core principle

**Screenshots are advertisements, not documentation.** Sell one idea per
slide. Lead with the strongest promise, then prove it, then close with trust
or a next step. The device is supporting evidence, not the hero.

## Quality bar

- Aim for a launch-campaign deck, not a template fill-in.
- Make the first three screenshots strong enough to sell the app without
  reading the description.
- Treat the set as one visual system: consistent typography, color logic,
  spacing rhythm, and device treatment.
- Use contrast intentionally: before/after, calm/urgent, simple/powerful.
- Prefer one unforgettable product state over three average feature states.
- Reject screenshots that feel like documentation, onboarding filler, settings
  pages, or generic feature lists — none of LexiTap's 6 planned shots are that,
  keep it that way if slides are added or swapped.
- Use the browser as a design engine: layered HTML, CSS gradients, masks,
  pseudo-elements, `backdrop-filter`, blend modes, local fonts, SVG filters,
  and small deterministic JS layout helpers are allowed when they improve the
  work.
- Use local npm packages only when they are deterministic and installed into
  the template. Never depend on remote CDNs at render time.

## The two non-negotiable correctness rules

1. **Exact dimensions or the store rejects the upload.** Set the Playwright
   viewport to the exact target size, `deviceScaleFactor: 1`, hard-size
   `#canvas` in px, and screenshot **that element**
   (`locator('#canvas').screenshot()`). Never `fullPage: true` — it
   screenshots scroll height and drifts ±1px. This is already wired in
   `render.mjs`; don't undo it.
2. **Resolution-independent layout via `vw`.** Because the viewport equals the
   canvas, `1vw = canvas_width/100`. All type and spacing use `vw`, so the
   SAME CSS renders identically across 6.9"/6.5"/6.3"/6.1" with zero
   per-size tweaking. Flexbox absorbs the minor aspect-ratio differences. Do
   not hardcode px in the layout.

## Setup

1. Copy `template/` into a working dir at the LexiTap repo root, e.g.
   `store-screenshots/` — **keep it OUT of `mobile/` and `content-tool/`**
   (their `npm run check` lint/typecheck/test gates must never see it).
   Add `store-screenshots/node_modules/` and `store-screenshots/out/` to
   `.gitignore` if they aren't already covered.
2. Install: `npm install` then `npx playwright install chromium`.
3. Drop raw simulator captures (PNG) into `screens/` — see `screens/README.txt`
   for the exact 6 filenames the bundled deck expects. Capture at the 6.9"
   size (largest), clean status bar (9:41, full battery, no charging bolt):
   ```
   xcrun simctl status_bar <UDID> override --time "9:41" --batteryState discharging --batteryLevel 100
   ```
4. `cp deck.example.json deck.json` — it's already filled in with LexiTap's
   app name, brand theme, and the 6 slides from `SCREENSHOTS_SPEC.md`. Edit
   only if the spec or copy changes.

## Configure the deck (`deck.json`)

- `appName`: `"LexiTap: English Vocabulary"` (matches the App Store listing
  name in `plans/STORE_ASSETS_PLAN.md`).
- `device`: `"iphone"` (the only profile — see Current coverage).
- `theme`: six CSS colors sourced from LexiTap's shipping design tokens
  (`mobile/src/presentation/theme/tokens.ts`, dark mode — the canvas is
  always dark regardless of the phone screenshot's own light/dark mode):
  - `navy` `#0E1112` = `bgBase`, `navyDeep` `#0A0C0D` = `bgSurfaceSunken`
  - `navyLift` `#20B2AA55` = brand teal `accent` at alpha, for the top glow
  - `ivory` `#F2F5F6` = `textPrimary` (dark mode) — the light material surface
  - `gold` `#FF9A3D` = `streak` — LexiTap has no literal gold token, the
    streak-orange fills the "punchy accent chip / ribbon" role instead
  - `muted` `#A9B2B6` = `textSecondary` (dark mode)
  If `tokens.ts` colors change, re-derive this block from the new values —
  don't let the deck drift from the shipping brand.
- `slides[]`: see "Source of truth for content" above for the 6 bundled
  slides. Each has `id`, `layout`, `label` (uppercase eyebrow), `headline`
  (`\n` for line breaks), `screenshot` (filename in `screens/`).
  - `layout: "device-bottom"` — hero promise; headline first, device supports
    it. Used for slides 1, 3, 5.
  - `layout: "device-top"` — the screenshot state is the proof. Used for
    slides 2, 4, 6.
  - `layout: "two-devices"` — not used in the bundled deck (no real
    before/after pair among the 6 planned shots); available if a future slide
    needs one.
  - `layout: "no-device"` — not used; add only for a closer with real trust
    numbers (ratings, user counts) — never invented ones.
- The `callout` on slide 4 (`{x:50, y:30, zoom:2.4, label:"1000+ words per pack"}`)
  magnifies the pack word-count detail so it reads at store-preview size.
  `x`/`y` are % of the screenshot — calibrate by eye against the actual
  `04_exam.png` capture, render, and nudge.

## Copywriting rules

- Outcome first, feature second: "Know where you stand," not "Score screen."
- Max ~5 words per headline line, max 2 lines. Use `\n` to control the break —
  never let a single word orphan onto its own line.
- The `bold` direction UPPERCASES headlines, which widens every line. If bold
  is in play, check its renders for orphan wraps and shorten the line rather
  than shrinking the type.
- The eyebrow labels the feature (`SPACED REPETITION`); the headline sells the
  result (`Studies what you forget.`). Never repeat one in the other.
- No jargon, no "seamlessly/effortlessly/powerful," no exclamation marks.
- Read the six headlines aloud in order — they should tell one story: no
  typing → smart scheduling → works anywhere → exam-specific → fair pricing →
  you're already ahead.
- Any copy change here should also update `website/assets/SCREENSHOTS_SPEC.md`
  (canonical) per the repo's Documentation Rule — keep both in sync.

## Render

```bash
npm run render:quick     # render all three directions at master res (6.9")
npm run render:all       # render all three directions at all bundled sizes
npm run render:compare   # compare directions and bezel treatments
npm run render:fancy     # render only the fancy direction
npm run render:bold      # render only the bold direction
```

- `--direction`: `classic`, `fancy`, `bold`, or `all` (default; recommended
  until the user chooses). `both` is a legacy alias for classic+fancy.
- `--treatment`: `frameless` (rounded screenshot + soft shadow; modern,
  recommended), `bezel` (photorealistic device frame via
  `frames/iphone-bezel.png`), or `both`.
- `--sizes`: a single id (`6.9`) for iteration, or `all` for the full export
  (App Store requires 6.9", 6.5", 6.3", and 6.1" sets — see
  `plans/STORE_ASSETS_PLAN.md` / `website/assets/SCREENSHOTS_SPEC.md`).
- `--deck`: path to an alternate deck JSON (default `deck.json`). Useful for
  callout calibration or variant experiments without touching the live deck.
- Output: `out/<direction>/<treatment>/<locale>/<sizeId>/<slideId>.png`.
- Showcase: `out/index.html`, generated after every render, with all rendered
  screenshots grouped side-by-side by direction, treatment, and size.

## The iteration loop (do this autonomously)

1. Run `npm run render:quick` to render all three directions at 6.9".
2. Read `out/index.html` and the output PNGs directly. Judge the campaign as
   a sequence: first impression, rhythm, type scale, contrast, cropping, and
   whether adjacent slides feel repetitive.
3. Compare the directions. If none is strong enough, create another direction
   in `render.mjs` and include it in the showcase.
4. Edit the `CSS` template in `render.mjs` (all vw units) or `deck.json`,
   re-render.
5. Loop until the showcase feels premium as a set. Only then batch
   `--sizes=all`.
6. Final-check `out/index.html` side-by-side across every requested size and
   treatment before handing the finished set to Ryan for App Store Connect
   upload (that upload step is manual — never automated from here).

## Bezel calibration

`frames/iphone-bezel.png` is a 1022×2082 device frame with an **opaque**
screen. The shot is layered ON TOP of the frame, clipped to the screen
rectangle via the `screenInset` percentages in `devices.json` (measured: left
5.088%, top 2.209%, width 89.824%, height 95.581%, corner radius 13.725% of
screen width). To use a different bezel PNG, re-measure its screen rectangle
as % of the image and update `devices.json`. Insets are % (not px) so one
calibration serves every export size.

## Fonts

Self-hosted via `@fontsource` (Playfair Display, Space Grotesk, and Inter),
inlined as base64 data URIs — no CDN, works offline, deterministic. To change
fonts, add the `@fontsource/*` package and edit the `FONTS` block in
`render.mjs`. Always `await document.fonts.ready` before screenshotting
(already wired).

## What NOT to do

- No `fullPage: true`. No `deviceScaleFactor` other than 1.
- No hardcoded px in the layout CSS — vw only.
- No CDN font/image URLs — everything inlined for determinism.
- Do not add iPad/tablet or Android output without Ryan's explicit go-ahead —
  LexiTap is iOS-first with Android on hold (CLAUDE.md).
- Don't put light-theme phone screenshots on a light canvas (they vanish).
  The canvas is always LexiTap's dark navy; invert only the phone content if
  a slide specifically needs a light-mode shot.
- Never invent trust numbers (ratings, review quotes, user counts) for a
  closer slide. Real numbers supplied by Ryan, or none — the bundled deck has
  no closer slide for exactly this reason.

## Declined on purpose (do not re-add)

- **A no-device closer slide with placeholder trust copy.** Wait for real
  numbers (ratings/review counts) before adding one.
- **An Android/Google Play device profile.** Product is iOS-first; Android is
  explicitly on hold per CLAUDE.md. Re-add only when Android ships.
- **App-category theme presets.** The theme is one JSON block already sourced
  from `tokens.ts` — brand comes from the app, not a canned genre look.
- **Auto-ranking directions.** The showcase presents them side by side; a
  human picks.
