# Design Level-Up — spend the design system the app already owns

**Status:** draft (2026-07-05) — pending Ryan's accept.
**Goal:** LexiTap ships an excellent token/design system that the screens barely
use — flat stacked cards, one thin gray bar, motion only on the button press, and
(verified) **the entire typographic system rendering in system font because the
fonts are never loaded.** This plan is the elevation layer: a north star, the
systemic component upgrades that unlock it, and per-screen redesigns that make the
learner *feel the words they know growing*. It is design/presentation only — no
domain/SRS, no schema, no new native modules.
**Issue:** none — user-initiated ("improve the plan to LEVEL UP the design").
**Relationship to the tactical plan:** [`UI_UX_FIXES_PLAN.md`](UI_UX_FIXES_PLAN.md)
(24 verified bug-fix phases) is **Tier 0** of this plan — table stakes. This
document does **not** restate those phases; it builds *above* them. Land Tier 0
fixes as they stand; this plan is what turns "less broken" into "premium."
**Method:** a 16-agent design workflow (7 orthogonal lenses → adversarial verify →
director synthesis → completeness critic). Every load-bearing claim below was
re-verified against source by hand (font-loading, `Word.word` not `.headword`, no
`.phonetic` field, `useMotion` reduce-motion behavior, Icon glyph availability,
`SessionComplete` props, the dual-primary Home collision).

---

## ⚠️ P0 — THE FONTS ARE NEVER LOADED (verified). Fix this first or nothing else shows.

`grep` across `mobile/app/` + `mobile/src/`: **zero** `useFonts`, `loadAsync`,
`SplashScreen`, or `@expo-google-fonts/*`. `expo-font` is in `package.json`
(`~56.0.5`) but **never invoked**. No Playfair/Inter `.ttf` is bundled.
[`tokens.ts`](../mobile/src/presentation/theme/tokens.ts) references font-family
names (`PlayfairDisplay_700Bold`, `Inter_400Regular`, `Inter_600SemiBold`, …) that
only exist if the matching `@expo-google-fonts` package is installed **and** loaded
via `useFonts`. Neither happens. Result: **every screen in the app renders in the
system font (SF on iOS).** The Playfair editorial voice is invisible; every Inter
weight is invisible.

This single fact explains most of the felt "plainness." It is a **Small** change
with the highest visual impact in the entire plan. It is Phase 1.1 below and blocks
every "editorial voice" recommendation — none of them do anything until fonts load.

Also affected: [`SignInScreen.tsx:63`](../mobile/src/presentation/screens/SignInScreen.tsx#L63)
hardcodes `fontFamily: 'Inter_400Regular'` — same silent fallback.

---

## North Star

> **LexiTap should feel like a calm, premium reading tool that quietly spends the
> design system it already owns.** One focal point per screen, carried by the unused
> depth tiers (`bgSurfaceRaised`/`bgSurfaceSunken`). The editorial Playfair voice
> rationed to the two or three genuine emotional moments (the word itself, the
> mastered-count, the endowed first-run reveal). The teal gradient+glow spent once
> per screen so it still means "act here." Motion that *confirms* progress rather
> than *performs* it — so every screen makes the learner feel their known-word set
> growing, without a single guilt cue or gamified flourish.

Not Duolingo-loud. Closer to Things / Bear / Elevate restraint.

## Elevation principles (measure every change against these)

1. **One focal point per screen.** Exactly one card is `raised`
   (`bgSurfaceRaised` + `borderStrong`) and holds the single teal-gradient
   primary `Button`. Everything else stays flat `bgSurface` with
   secondary/tertiary. Never two raised cards at once — gate mutually-exclusive
   states (e.g. first-run hero vs. Resume card).
2. **Depth is meaning, not decoration.** The 4-surface system
   (`bgBase`/`bgSurface`/`bgSurfaceRaised`/`bgSurfaceSunken`) encodes a real
   z-hierarchy: raised = act-now, sunken = inset citation (examples), flat =
   context.
3. **Editorial voice for moments only.** Playfair (`h1` 44 / `display` 34) is
   spent ONLY on emotional payoffs. Functional headers and **any localized/user
   string** stay Inter (a serif display face on an Arabic or CJK string is wrong).
   Max two type weights per screen.
4. **Scarce teal.** Gradient+glow primary `Button` appears once per screen.
   Accent-as-graphic (ring, left-spine, chip) is fine; accent-as-*text* uses
   `accentText` for AA.
5. **Motion confirms, never performs.** Every animation routes through
   `useMotion()` and degrades under Reduce Motion. Motion serves momentum/closure:
   fill-grows, gentle transition, one settle on completion. No confetti, no loops,
   no count-ups. **(Correctness note — the synthesis got this wrong, the critic
   caught it: `useMotion().spring()` DOES return `{duration:0}` under Reduce Motion
   ([useMotion.ts:31](../mobile/src/presentation/theme/useMotion.ts#L31)). So any
   spring routed through the hook is already handled. A manual `!reduceMotion`
   guard is needed ONLY for RAW `withSpring(springs.x)` calls that bypass the hook —
   because `withSpring` ignores `duration:0`. Do not sprinkle `!reduceMotion`
   branches on hook-routed animations; that's cargo-cult.)**
6. **Color never carries meaning alone (WCAG 1.4.1).** Every state change
   (cap reached, word mastered, streak at-risk) pairs color with an icon or text
   channel. Success green is a fill/icon, never the only signal, never body text.
7. **Never invent domain concepts.** Design only from data that exists:
   `streak` / `totalSessions` / `totalWordsMastered`, `getDailyProgress`,
   `getMasteryLevels` / `masteryCompletion` / `countMastered`, `getSavedWordCount`,
   `frontierRank` / `estimateKnownCount`. No milestones, badges, weekly rollups,
   phonetics, or due-counts — none exist in the data surface.
8. **Honor the locked Rich Word Detail.** The felt `explanation` paragraph stays
   the star — full `textPrimary` body, above the examples, more prominent than the
   gloss. Elevate its *presentation* (air, measure, rhythm) only. Never shrink,
   bullet, or replace it with a hero gloss. (Ryan-approved, [memory 2026-06-09].)

---

## Decisions needed from Ryan

1. **Ship shape.** Land this as one big push, or tier-by-tier PRs
   (Tier 1 foundation first, then screens)? **Default: tier-by-tier** — Tier 1 is
   invisible-until-adopted plumbing; Tiers 2/3 are the visible wins. Each tier is
   independently shippable via EAS Update (all presentation-layer).
2. **The RING (daily-cap on Home, mastery on Progress/Onboarding) is likely
   net-new vs the finalized Figma, which may show a bar.** Per the "don't mint a
   third design language" rule, the honest path is: **confirm against
   [`.design-specs/FIGMA.md`](../.design-specs/FIGMA.md) first; if no ring exists on
   the finalized Home/Progress frames, update Figma before building it.** I could
   not check Figma this session (Figma MCP is unauthenticated). **Default
   recommendation:** build the ring (it's the single highest-impact viz move), but
   gate it behind a Figma reconciliation step so Figma stays source-of-truth.
   *If you'd rather stay 1:1 with current Figma, the fallback is the animated
   `ProgressBar` with a `display`-number hero above it — less striking, zero Figma
   risk.*
3. **Onboarding scope (critic's #1 gap).** The endowed first-run reveal ("you
   already know ~X words," via the real `estimateKnownCount` helper) is the app's
   highest-emotion first impression and today gets one throwaway caption. Do you
   want it redesigned as a real screen in this plan (Tier 5), or scoped separately?
   **Default: include it as Tier 5** — it deserves the ring + Playfair treatment
   more than Home does, and the ring component is already being built.
4. **Coverage gap — screenshot-driven pass on the un-photographed surfaces.**
   I have screenshots for Home / Learn / Progress / Settings / exit-sheet /
   all-caught-up only. **QuizScreen (the answering moment), LearnQuickCheck,
   PaywallScreen, and Onboarding were reasoned from source, not screenshots.** The
   critic flags all four as under-covered (esp. the Paywall single-primary audit and
   the quiz "caution-not-red" feedback moment). **Default: land Tiers 1–3, then run
   a second design-critique pass with fresh screenshots of those four before
   speccing them** — don't blind-spec a screen I haven't seen rendered.
5. **Confirm two cuts** (I'm cutting these against the workflow's own suggestions —
   they violate the calm-voice north star): the **streak count-up flame-pulse** and
   the **SessionComplete stagger cascade**. See [Cut / rejected](#cut--rejected).
   Say the word if you actually want a livelier streak moment and I'll re-add it.

---

## Tier 0 — Tactical fixes (already planned, DO NOT restate)

All 24 phases in [`UI_UX_FIXES_PLAN.md`](UI_UX_FIXES_PLAN.md): CTA variant flip,
status-bar theming, header spacing, example cards, sticky footer, button labels,
word nav, Progress tappable card + reframed mastery + visible %, empty-state
clarity, Today widget, Settings toggle contrast + analytics double-negative +
Delete Account move, Learn recap, All-caught-up clarity, ExitSessionSheet
copy/scrim/tap-outside. **These are table stakes.** Several are *superseded/absorbed*
by richer Tier 1–3 work here (e.g. tactical Phase 4 "example card" → Tier 3's
sunken-well citation; tactical Phase 5 sticky footer → Tier 1 `Screen` footer slot;
tactical Phase 19 recap → Tier 3 recap parity). Where they overlap, the richer
version wins; where they don't, land the tactical fix as-is.

---

## Tier 1 — Foundation (highest impact-per-effort; unblocks everything)

Systemic upgrades that lift every screen at once. All additive (optional props,
zero behavior change when unused). Build these first; the screen redesigns depend
on them.

### Phase 1.1 — Load the fonts (P0)
- `mobile/package.json`: add `@expo-google-fonts/playfair-display` +
  `@expo-google-fonts/inter`.
- [`app/_layout.tsx`](../mobile/app/_layout.tsx): `useFonts([PlayfairDisplay_700Bold,
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold])`; hold render
  behind `SplashScreen.preventAutoHideAsync()` until fonts **and** the existing
  `services` container both resolve (the spinner seam at lines 69–72 is the natural
  gate — fold font-readiness into it). `SplashScreen.hideAsync()` when ready.
- **Done means:** `npm run check` GREEN + on-device screenshot proving a Playfair
  serif `g`/`a` actually paints (a lowercase-`g` double-story is the tell). Until a
  device confirms glyphs render, this is unproven — local tests can't see it.
- **Respects locked:** no-emoji, single-teal, all — pure infra.

### Phase 1.2 — Card depth variants (raised focal + interactive spring-press)
- [`Card.tsx`](../mobile/src/presentation/components/Card.tsx): add optional
  `interactive` + `onPress` — wraps children in a reanimated `Animated.View` reusing
  Button's exact snap-spring press-scale (0.97), sets `minHeight ≥ 48` +
  `accessibilityRole="button"` **only when `onPress` present**. Keep `raised` as-is.
- **Done means:** `npm run check` GREEN; existing Card consumers visually unchanged
  (default path untouched).
- **Unlocks:** the focal-hierarchy pattern on Home/Progress; meaning-cards on LearnCard.

### Phase 1.3 — `usePressScale` hook (extract from Button)
- Factor Button's `useSharedValue(scale/opacity)` + `handlePressIn/Out` into a
  shared hook / `PressableScale`. Apply to every tappable that today only drops
  opacity: LearnCard bookmark, Progress rows, `ListRow`.
- Bookmark: scale to 0.88 **and** bump padding so the effective target clears 48px
  (currently ~46, borderline). Stays a `Pressable` (testID/a11y propagate).
- **Done means:** `npm run check` GREEN; uniform tactile response app-wide.

### Phase 1.4 — SegmentedProgress token-purity fix (prerequisite)
- [`ProgressBar.tsx:60–111`](../mobile/src/presentation/components/ProgressBar.tsx#L60):
  replace hardcoded `rgba(255,255,255,0.10)` inactive → `colors.borderSubtle`;
  `rgba(32,178,170,0.4)` in-progress → `accentSubtle` or a derived accent tint;
  drop the `className="flex-1"/"flex-row gap-[6px]"` for token styles. Keep
  `accessibilityValue{min,max,now}`.
- **Done means:** `npm run check` GREEN. Must land before any screen adopts it.

### Phase 1.5 — Animated ProgressBar with completion cue
- [`ProgressBar.tsx`](../mobile/src/presentation/components/ProgressBar.tsx):
  Paper's internal fill can't be animated from outside — add an absolutely-positioned
  `Animated.View` inside the existing `overflow:hidden` track; interpolate width
  `0→value` on mount **and** on value change via `useMotion().timing('base')`. Add
  `tone: 'accent' | 'success'` + optional milestone `ticks`. At `progress ≥ 1`, flip
  to `success` **and** render a `check` `Icon` / update `accessibilityLabel` (color
  alone fails 1.4.1).
- **CRITICAL:** keep `accessibilityRole="progressbar"` + `accessibilityValue` on the
  OUTER `View` and **update `now` on value change**, not just mount.
- **Done means:** `npm run check` GREEN + screenshot of a mid-fill and a completed
  (green + check) bar.

### Phase 1.6 — MasteryRing component (react-native-svg)
- New `mobile/src/presentation/components/MasteryRing.tsx`: animated `Circle`
  `strokeDashoffset` (`createAnimatedComponent`; `react-native-svg` already a dep via
  `Icon`). Centered figure in `variant="display"` (Playfair) — **one** big-number
  voice per screen. Mount sweep via `useMotion().timing('slow')`.
- **a11y:** `accessibilityRole="progressbar"` + `accessibilityValue` + a **combined**
  label ("214 words mastered, 8 percent of collection") so VoiceOver gets a summary,
  not a bare SVG. `tabularNums`. `numberOfLines={1}` + `adjustsFontSizeToFit` (or a
  ring-size floor) so 4-digit counts + `fontScaleMax.h1` (1.2) don't clip.
- **Near-empty tiers:** show raw mastered **count** as hero, `%` secondary — so
  `0/2848` reads as *a start*, not a scold.
- **Gate:** see Decision #2 (Figma reconciliation) before building.
- **Done means:** `npm run check` GREEN + screenshots at 0%, mid, and a 4-digit count.
- **Unlocks:** Home daily-review hero, Progress mastery hero, Onboarding reveal.

### Phase 1.7 — Screen sticky-footer slot (measured, safe-area-correct)
- [`Screen.tsx`](../mobile/src/presentation/screens/Screen.tsx): add optional
  `footer?: ReactNode` + `contentStyle?: ViewStyle`. **Measure** footer height via
  `onLayout` → feed `contentContainerStyle.paddingBottom` (never hardcode). Render
  footer INSIDE `SafeAreaView`; apply the bottom safe-area inset **exactly once**
  (footer OR scrollview, not both). No-op when `scroll={false}`.
- **Regression-test EVERY screen** — all use `Screen`.
- **Done means:** `npm run check` GREEN + all-screens smoke; then it anchors the
  LearnCard "Got it" and Home primary CTAs.
- (Supersedes tactical Phase 5.)

### Phase 1.8 — Shared primitives: EmptyState / SectionHeader / ListRow / StatTile
- Four small new files.
  - **`EmptyState`** (icon + headline + body + optional CTA) — every empty screen.
  - **`SectionHeader`** (`smallCaps` eyebrow) — consolidates the inline
    `MEANING n`/`EXAMPLES` labels + adds dashboard reading-order eyebrows.
  - **`ListRow`** — enforces `minHeight: layout.minTouchTarget` (48). **Fixes a LIVE
    a11y bug:** the Saved-words `Pressable` at
    [`ProgressScreen.tsx:120–137`](../mobile/src/presentation/screens/ProgressScreen.tsx#L120)
    has no `minHeight`. **Destructive-label caveat:** `destructive` `#E5484D` on
    `bgSurface` `#171A1C` computes ≈4.47:1 (below the 4.5:1 small-text floor —
    verify at build) → render destructive labels ≥18px or keep them on `bgBase`.
  - **`StatTile`** (value in `display`, `smallCaps` label, `tabularNums`) — replaces
    run-on stat lines.
- **Done means:** `npm run check` GREEN + render tests for `ListRow` min-height and
  `EmptyState`.

---

## Tier 2 — The two screens that carry the product's feeling

### Phase 2.1 — HomeScreen redesign
Diagnosis: three near-identical flat cards; daily-cap is a buried 8px bar; **two
`variant="primary"` teal-glow buttons render at once when a session is in flight**
([HomeScreen.tsx:116](../mobile/src/presentation/screens/HomeScreen.tsx#L116) +
[144](../mobile/src/presentation/screens/HomeScreen.tsx#L144)) — the glows cancel.
Target: one-glance "here is your day."
1. **Kill the dual-primary collision.** Compute `primaryAction = resume ?? review
   ?? learn`; only that `Button` is `primary`, the rest `secondary`. (~4 lines.
   Absorbs tactical Phase 1.)
2. **Raise the focal card, keep the rest flat.** `raised` on the focal card
   (Resume-in-flight, else Ready-for-today); others default.
3. **Daily-review ring as hero.** Replace the 8px bar with `MasteryRing` (~120px)
   inside the focal card; fill = `min(reviewsCompletedToday/effectiveDailyCap, 1)` —
   the exact existing expression, zero new data.
4. **Card rhythm.** Pass `contentStyle={{ gap: spacing.s4 }}` to `<Screen>` so the
   gap lands *between* sibling cards (the wrapper `View` has no gap today); greeting→hero
   gap `s5`.
5. **Editorial greeting + streak.** Greeting → `variant="display"` (only after 1.1);
   promote streak from the corner pill to a hero-adjacent `StreakBadge` + optional
   `totalWordsMastered` chip (existing stats).
6. **Completed + resume states.** At cap: green ring + check + "Today's reviews are
   done" (no red, no dead CTA). Resume caption shows next word via
   `activeSession.batch[Math.min(index, batch.length-1)].word` (**`.word`, not
   `.headword` — that field doesn't exist**; workflow caught its own compile error).
   Animate ring `0→current` on FIRST mount only; `prev→current` on `refreshSignal`
   (store `prev` in a ref) so tab-focus doesn't re-sweep.
- **Read-failure honesty (added, critic gap):** `load()` swallows read errors into
  `stats=null` → today that looks identical to a brand-new user. The ring/streak row
  must NOT render "0 / brand-new" on a *read failure* for a returning learner — show
  a neutral "couldn't load — pull to retry" affordance, distinct from a genuine zero.
- **Done means:** `npm run check` GREEN + screenshots: fresh install, mid-day,
  at-cap, resume-in-flight, and a forced read-failure.

### Phase 2.2 — ProgressScreen redesign
Diagnosis: a numbers dump (`Longest: X · Sessions: Y · Mastered: Z` run-on line + a
1px gray sliver + "0 of 2848 mastered"). The emotional payoff — seeing known words
grow — is invisible.
1. **Hero mastery ring + Known/Learning/New.** `MasteryRing` with `countMastered()`
   as the display hero. Derive `known = level5` / `learning = level1–4` /
   `new = remainder` from the `MasteryLevel[]` that `load()` **already fetches and
   discards** — pure counting, no new query (matches the O-5 taxonomy; confirm the
   exact `MasteryLevel` enum boundaries against `domain/srs` at build — a read, not a
   write). Legend uses dot + color + count + label (redundant channels per principle 6).
2. **StatTiles replace the run-on line** (longest streak / sessions / mastered→the
   ring, drop the dup). Only the 3 real `UserStats` fields.
3. **Fix the Saved-words touch target** → `ListRow` (48px). Live WCAG-2.2 fix.
4. **Designed "Today" block** (raised Card, two animated `ProgressBar` rows from
   `getDailyProgress`). Use only **existing** glyphs: `bar-chart-2`/`circle`
   (reviews), `book-open` (new words), `check`+`success` (done). **Do NOT use
   `refresh-cw`/`sparkles` — confirmed absent from `Icon.tsx`** (add via the
   Lucide-source recipe if genuinely wanted, per memory's icon-add pattern).
5. **Section eyebrows + first-run vessel** (`SectionHeader`: vocabulary→today→
   streak→saved). First-run (`totalSessions === 0`): ring at 0 as an *invitation*
   vessel + endowed copy, no invented badges. At-risk streak uses the **`caution`**
   token + soft copy, never `destructive`/alarm.
- **Done means:** `npm run check` GREEN + new render tests (Known/Learning/New split;
  first-run vessel) + screenshots at 0, mid, and 4-digit mastered.

---

## Tier 3 — The heart screen + session closure

### Phase 3.1 — LearnCardScreen: premium reader
Diagnosis: heart of the product, plainly rendered. Cramped 5-control header; word
uses `display` with a redundant inline `fontWeight:'700'`; the locked felt
explanation sits visually EQUAL to the gloss on bare `bgBase`; examples are loose
italic Text floating in dead space; multi-sense = one wall split by 1px hairlines;
advance = `cardKey` remount with zero transition.
1. **Two-tier header.** Tier 1 = full-bleed thin progress line (`ProgressBar
   height={4}`); tier 2 = compact control row (Back as `x` Icon + counter +
   bookmark). Keeps the exit-sheet trigger; Back keeps 48px via padding+hitSlop.
   (Absorbs tactical Phase 3.)
2. **Examples as sunken-well citations.** Wrap each example in a `bgSurfaceSunken`
   card (the unused token) with a 2px `accent` left-spine; **bold the target word**
   (case-insensitive split; fall back to the plain sentence when the word is
   inflected/absent — never crash); drop italic. `textSecondary` on `bgSurfaceSunken`
   ≈ 9.08:1 AA. Explanation stays on `bgBase`, dominant. (Absorbs/supersedes
   tactical Phase 4.)
3. **Typographic ladder** (word → gloss → explanation). Promote word to
   `variant="h1"`, **delete the redundant `fontWeight` override**
   ([LearnCardScreen.tsx:314](../mobile/src/presentation/screens/LearnCardScreen.tsx#L314)),
   add `marginTop s3` above the explanation so it reads as the settled body star.
   **Do NOT add a phonetic line — `word.phonetic` does not exist on the `Word` type**
   (verified); that's future content work.
4. **Felt-explanation type spec (added — critic gap; the locked star needs its own
   treatment, not just an elevated surround):** cap measure to ~66ch against
   `layout.contentMaxWidth` (600); set the explanation to `bodyLg` (18/26) with
   generous paragraph rhythm and a defined vertical-air ratio to the gloss above. A
   wall of `body` on flat black is exactly the plainness being fixed. Role unchanged
   (still `textPrimary`, still the star) — only the reading rhythm is specified.
5. **Multi-sense meaning cards.** Wrap each sense in a `Card` (`bgSurface` +
   `borderSubtle`); remove the manual hairline divider. Explanation stays the star
   inside each card; single-sense path stays flat.
6. **Gentle advance transition** (revised from the synthesis — see Cut/rejected).
   Cross-fade the keyed word-body via reanimated layout animation
   (`FadeOut.duration(motion.fast)` / `FadeIn.duration(motion.base)`), **not** a
   horizontal page-slide (skeuomorphic theater between vocab words). Pair the
   batch-header segment fill in the same beat. Gate raw springs on `!reduceMotion`;
   move SR focus to the new word after swap.
7. **"All caught up" as accomplishment.** `EmptyState`: `check` 40 `success`,
   "You've learned them all," warm body. CTA = unconditional "Back to Home"
   (`router.replace('/')`). **Do NOT gate a "Review now" on
   `reviewsCompletedToday < cap`** — that's a *done*-count, not a *due*-count, and no
   due-count query exists (dead-end risk). Split budget-reached vs pool-exhausted
   copy. (Absorbs tactical Phase 20; supersedes the flat state at lines 196–210.)
- **Deferred rider — Listen pill.** Redesign is fine but `audioPath` is null on every
  word today ([LearnCardScreen.tsx:318](../mobile/src/presentation/screens/LearnCardScreen.tsx#L318)
  is a `console.log` stub). LOW priority — bundle with the eventual audio-wiring task;
  don't ship a standalone control that renders on zero words. A visible dead stub is
  an emotional-design liability — if it can't be wired, hide it, don't polish it.
- **Done means:** `npm run check` GREEN + render tests (sunken example bolding,
  h1 ladder, multi-sense cards) + screenshots (single-sense, multi-sense, empty).

### Phase 3.2 — Learn recap parity (fixes "I can't find the words I know")
- The learn flow hard-cuts to Home: [`learn-check.tsx`](../mobile/app/learn-check.tsx)
  `onComplete = router.replace('/')` — no acknowledgement, while the review flow has
  `SessionCompleteScreen`. Render a recap **after `LearnQuickCheck`** (the SRS-writing
  step — recap goes after it, NOT after LearnCard), via a new `recap` phase.
- **Source data by reading** (no new query, presentation-only): `getUserStats()` for
  `currentStreak`; **`streakIncremented = false`** (the learn flow does NOT own streak
  increments — verified; passing `true` would fake a reward); `wordsReviewed =
  batch.length`; `moreItemsAvailable = false`. Add optional `variant: 'learn'`
  swapping the headline to "You met N new words today."
- Ship minimal (count + streak + Done). The read-only re-entry word-list is a
  separate later item (and retargets to the "Learned" list once
  [`WORD_LISTS_PLAN.md`](WORD_LISTS_PLAN.md) ships). (Absorbs tactical Phase 19.)
- **Done means:** `npm run check` GREEN + render test + screenshot of the learn-flow
  recap; verify resume/`?resume=1` re-entry does NOT route through the recap.

### Phase 3.3 — SessionComplete as an earned moment
- [`SessionCompleteScreen.tsx`](../mobile/src/presentation/screens/SessionCompleteScreen.tsx):
  contain the 5 loose center-stacked elements in a `raised` Card. Check icon scales
  `0.6→1.0` via `withSpring(springs.settle)` **in sync with the existing mount
  haptic**. **Gate the spring on an explicit `!reduceMotion` branch** (mount at
  scale 1, skip entirely) — raw `withSpring` ignores `duration:0`. SR focus lands on
  the header regardless. Same neutral copy, no accuracy, no red.
- **NO stagger cascade** (see Cut/rejected — one settle, per principle 5).
- **Done means:** `npm run check` GREEN + screenshot; Reduce-Motion path mounts static.

---

## Tier 4 — Voice, delight & hygiene polish

### Phase 4.1 — Unify empty/done microcopy voice
One contract across `SessionComplete` / Quiz-empty / Learn-empty / SavedWords-empty /
`ForgivenessSheet` (currently four registers). Audit `LearnQuickCheck`'s
AFFIRM/CORRECTION arrays for the same voice. Copy-only; document in
`lexitap-docs/03-ux-design/`.

### Phase 4.2 — ExitSessionSheet as a calm decision
Lead with "Take a break?"; relabel "Leave" → "Pause for now" (honest — the snapshot
is resumable). Update `accessibilityLabel` + hints. (Absorbs tactical Phases 22–24;
**run tactical Phase 21 first** — the "Leave" button's plain-text look is a suspected
stale build; source already codes it `secondary fullWidth`, verified.)

### Phase 4.3 — SavedWords + first-run endowed states
SavedWords empty → `EmptyState` with the real `bookmark` glyph (so learners recognize
the affordance in the wild). First-run Home/Progress use
`estimateKnownCount(frontierRank, poolSize)` (real pure helper, already used at O-5)
for endowed-progress copy in Playfair. **Gate first-run hero vs raised Resume card as
mutually exclusive** so two raised heroes never stack (principle 1). Also: the
Saved-words section is gated behind `savedCount > 0` — a learner who never saved a
word never learns the affordance exists (flag for a discoverable zero-state).

### Phase 4.4 — Settings hygiene
Route Settings rows through `ListRow` (48px floor) + `SectionHeader`. Render the
destructive Delete Account label ≥18px OR on `bgBase` (contrast footgun above).
Minimal — no elevation theater. (Composes with tactical Phases 14–17.)

---

## Tier 5 — Onboarding endowed reveal (critic's #1 missing move)

The single biggest emotional-payoff moment in the product — first-run "you already
know ~X words" — currently gets `estimateKnownCount` piped into a caption. It
deserves the `MasteryRing` + Playfair `display` treatment **more than Home does**:
it's the first impression and the endowed-progress hook that drives retention.
- Spec `OnboardingAdaptiveDiagnosticScreen` / knowledge-map reveal as a real screen:
  the ring sweeping up to `estimateKnownCount`, a Playfair hero number, one calm
  settle, endowed copy ("You already know about X words — let's build from there").
- **Gated on Decision #3 + a fresh screenshot** (I haven't seen these screens
  rendered). Source-read only so far.
- **Done means:** screenshot of the reveal + `npm run check` GREEN.

---

## Explicit coverage gaps — honest, needs a follow-up pass

Not silently omitted; named so a future agent (or the next screenshot pass) picks
them up. Most need screenshots I don't have (Decision #4):
- **QuizScreen answering moment** — the review flow's heartbeat (option cards +
  caution-not-red correction) where the "no-guilt" voice lives or dies. Unspecced.
  The `Card` interactive-press primitive (1.2) is exactly what option cards need.
- **LearnQuickCheck** — the SRS-writing recognition screen; recap sits after it but
  its own hierarchy/feedback is untouched.
- **PaywallScreen** — the conversion + revenue screen, highest teal-density in the
  app (12 gradient/display refs). Audit it for the single-primary rule the plan just
  proved is violated on Home — don't skip the money screen while fixing Home.
- **Loading states** — the font P0 forces a splash-hold; QuizScreen + LearnCard
  ("Loading new words…") + Home's zero-flash all pop from empty→real. A designed
  skeleton/quiet-pulse (not a bare spinner) is a low-effort systemic primitive.
- **Light-theme AA re-verification** — every contrast pairing above is dark-canonical.
  The derived `lightColors` (accent `#178F88`, textTertiary `#676F73`, streak
  `#E07B2E`, success `#2E7D32`) needs its own AA pass for the raised-card / sunken-well
  / accentText / destructive-row / smallCaps-eyebrow pairings.
- **Dynamic Type reflow** — a 34pt Playfair greeting (×1.2) + a 120–140px ring + cards
  + streak row can overflow small screens at max text size. Confirm scroll/reflow.

---

## Locked-decision compliance (what this plan deliberately does NOT do)

- **Rich Word Detail felt explanation stays the star** — every LearnCard change
  elevates its *surround* (air, sunken examples, h1 word, its own measure spec); its
  role/prominence/color is untouched. This is the single most important guardrail.
- **No emoji** — all iconography via `Icon` (Lucide); every referenced glyph verified
  present or flagged for the Lucide-source add recipe.
- **No TextInput** on any learn/quiz screen (passive recognition invariant).
- **Single teal brand** — scarce-teal principle *reduces* teal usage; no new colors.
- **No proficiency picker** (D1). No manual-level UI anywhere.
- **48px targets + WCAG AA** — every color pairing states its tokens; `ListRow`
  fixes a live sub-48 bug rather than adding new ones.
- **No domain concepts invented** — Known/Learning/New is *counting* existing
  `MasteryLevel[]`; no milestones/badges/weekly-rollups/due-counts.
- **No high-risk path touched** — presentation-layer only. The only reads are of
  existing use-case output (`getUserStats`, `getDailyProgress`, `getMasteryLevels`,
  `estimateKnownCount`); nothing writes `domain/srs`, `infrastructure/db`, or
  `infrastructure/analytics`. All EAS-Update shippable (except the font packages in
  1.1, which are a JS dep add — confirm whether a new native build is needed for the
  bundled font assets; `@expo-google-fonts` ships `.ttf` via JS bundle, usually
  OTA-safe, but verify).

## Cut / rejected (against the workflow's own suggestions — honesty over consensus)
- **Streak count-up flame-pulse (MOT-2).** Cut. A streak going up is a calendar
  fact, not something the learner *did* this session — animating it performs
  celebration the calm-tool voice explicitly forbids. The workflow filed it as
  low-impact/tier-4; the critic said cut, not defer. Agreed. (Reopen via Decision #5.)
- **SessionComplete stagger cascade.** Cut. Contradicts its own "one settle on
  completion" principle. Keep the single check settle only.
- **Horizontal page-turn slide on LearnCard.** Rejected in favor of a cross-fade —
  a slide between vocabulary words is skeuomorphic decoration (no physical page); a
  cross-fade marks "new word" with less theater.
- **Per-word dot-map for 2848-word tiers.** Rejected — meaningless at that scale;
  the Playfair-hero + count-led bar + encouraging caption is the right density.

## Motion correctness (get this right — the synthesis didn't)
`useMotion().spring(preset)` and `.timing(token)` BOTH return `{duration:0}` under
Reduce Motion ([useMotion.ts:26–41](../mobile/src/presentation/theme/useMotion.ts#L26)).
So any animation routed through the hook is already handled — do **not** add
`!reduceMotion` branches to hook-routed animations. The manual `!reduceMotion` guard
is required ONLY for raw `withSpring(springs.x)` calls that bypass the hook (because
`withSpring` ignores a `{duration:0}` config). Phases 3.3 (raw settle spring) and any
raw reanimated-layout-animation are the only places that guard belongs.

## Figma source-of-truth reconciliation (constraint 9)
Most recs REALIGN code back to the already-finalized Figma the shipped screens fell
short of (raised-focal depth, scarce-teal single-primary, Playfair on hero moments,
multi-sense meaning cards, sunken-well examples) — no Figma change needed. Items that
PUSH BEYOND current Figma and therefore **require updating Figma first as
source-of-truth:** (1) the daily-review / mastery **ring** (if Figma shows a bar);
(2) the **learn-flow recap** screen (new); (3) the `Screen` **sticky-footer** + CTA
anchoring; (4) the **animated-ProgressBar completion** (success+check) and
`SegmentedProgress` on the batch header. Confirm each against
[`.design-specs/FIGMA.md`](../.design-specs/FIGMA.md) before building; update Figma
where net-new (I could not — Figma MCP unauthenticated this session).

## Risks / gotchas
- **1.1 font load is unproven until a device confirms glyphs paint** — local tests
  can't see typefaces. On-device screenshot is the only acceptance.
- **1.7 `Screen` footer + contentStyle touch every screen** — additive/optional,
  zero effect when omitted, but run the FULL mobile suite + all-tabs smoke, not one
  screen.
- **1.6 ring / 2.x contrast are dark-canonical only** — light-theme AA pass is a
  named gap, not done.
- **Per AGENTS.md: local-green ≠ CI-green** — confirm CI after each tier's push.
- **MasteryLevel enum boundaries** for Known/Learning/New must match `domain/srs`'s
  actual level semantics — confirm at build (it's a read, low-risk, but a wrong
  boundary mislabels the learner's progress).
- **Concurrent-session hazard** — this touches many `presentation/` files + `Screen.tsx`
  + `Card.tsx` + `ProgressBar.tsx` (shared). One owner per shared component at a time;
  no `git add -A`.

## Docs to update on completion
- **CLAUDE.md / AGENTS.md** — new reusable patterns: `MasteryRing`, `Card interactive`,
  `Screen footer slot`, `usePressScale`, the four shared primitives, and the **motion
  reduce-motion rule** (raw-springs-only guard) — these are the kind of "how do we do
  X here" facts a future agent needs.
- **`lexitap-docs/03-ux-design/DESIGN_SYSTEM.md`** — the north star + 8 principles +
  the empty/done voice contract (Phase 4.1).
- **`.design-specs/FIGMA.md` + Figma** — update per the reconciliation note for any
  net-new element (ring, recap, footer, animated completion).
- **`memory/MEMORY.md`** — session note; and specifically record the font-loading P0
  (it silently degraded the whole type system and no test caught it — a future agent
  must know the fonts are load-bearing and device-only-verifiable).
- **`ORCHESTRATION.md` / `ROADMAP.md`** via `/orchestrate sync` if any of this becomes
  a tracked task.
