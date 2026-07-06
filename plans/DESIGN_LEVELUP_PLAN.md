# Design Level-Up — implement the finalized Figma the code fell short of

**Status:** ✅ DONE (2026-07-06) — Tiers 1–5 + all coverage gaps executed in one session, 18 commits `f72d879`…`4b79aa1`. 68 suites / 614 tests green. Full session note: [`memory/2026-07-06_design-levelup-execution.md`](../memory/2026-07-06_design-levelup-execution.md). Remaining: light-theme AA pass, Dynamic Type reflow, loading-state skeletons (named gaps, own pass); on-device screenshot verification (font rendering is a native-module change — needs a new EAS build).
**Goal:** LexiTap ships an excellent token/design system **and a finalized premium
Figma** (file `8YT6PYWnpX6nqkT2mxXOwi`) that the shipped screens fall well short of —
flat stacked cards, one thin gray bar, motion only on the button press, and (verified)
**the entire typographic system rendering in system font because the fonts are never
loaded.** This plan is the elevation layer: a north star, the systemic component
upgrades that unlock it, and per-screen redesigns that **realign the code to the
finalized Figma** and make the learner *feel the words they know growing*.
Design/presentation only — no domain/SRS, no schema, no new native modules.
**Issue:** none — user-initiated ("improve the plan to LEVEL UP the design").
**Relationship to the tactical plan:** [`UI_UX_FIXES_PLAN.md`](UI_UX_FIXES_PLAN.md)
(24 verified bug-fix phases) is **Tier 0** — table stakes. This document builds
*above* them; where they overlap (example cards, sticky footer, recap), the richer
version here wins.
**Method:** a 16-agent design workflow (7 lenses → adversarial verify → director →
critic), then **every load-bearing claim re-verified against source AND against the
live finalized Figma this session** (Dev Mode MCP, active file confirmed). Reading the
Figma **overturned three of the workflow's own recommendations** — see
[Figma ground truth](#figma-ground-truth-read-live-2026-07-05) — which is exactly why
it was worth doing before writing a build plan.

---

## ⚠️ P0 — THE FONTS ARE NEVER LOADED (verified). Fix this first or nothing else shows.

`grep` across `mobile/app/` + `mobile/src/`: **zero** `useFonts`, `loadAsync`,
`SplashScreen`, or `@expo-google-fonts/*`. `expo-font` is in `package.json`
(`~56.0.5`) but **never invoked**. No Playfair/Inter `.ttf` is bundled.
[`tokens.ts`](../mobile/src/presentation/theme/tokens.ts) references font-family
names (`PlayfairDisplay_700Bold`, `Inter_400Regular`, `Inter_700Bold`, …) that only
resolve if the matching `@expo-google-fonts` package is installed **and** loaded via
`useFonts`. Neither happens. Result: **every screen renders in the system font (SF).**

Confirmed against Figma: the canonical Home greeting is `Inter Bold 28` (`title`
token). The code correctly assigns `variant="title"` — but with no font loaded it
paints as **SF, not Inter.** So this is not just "Playfair is missing" — **neither
Inter nor Playfair renders anywhere.** This single fact explains most of the felt
"plainness." **Small** change, highest visual impact in the plan. Phase 1.1; blocks
every typographic recommendation.

Also: [`SignInScreen.tsx:63`](../mobile/src/presentation/screens/SignInScreen.tsx#L63)
hardcodes `fontFamily: 'Inter_400Regular'` — same silent fallback.

---

## Figma ground truth (read live, 2026-07-05)

Read the finalized frames directly (Dev Mode MCP, file `8YT6PYWnpX6nqkT2mxXOwi`).
**The design decisions the shipped code ignored — realign to these; do NOT invent
past them.**

**Home — canonical frame `300:2` "03 · Home (Polished) — Rebuilt":**
- Daily goal = a **horizontal teal-gradient meter** (`DailyCapMeter`, ~34px tall) +
  "8 / 15 reviewed today". **A meter, not a ring.**
- "Words ready to review" = the **ONE raised focal card** + a **single teal-gradient
  "Start review" primary**. "Core 3,000" and others are flat cards.
- Core 3,000 known = a **3-segment bar** (`KnowledgeMapBar`, green=known / teal=learning
  / gray=new) + "1,240 / 3,000 known · Core 3,000" + an **outlined "Keep learning"**
  (demoted, NOT a second teal fill).
- Greeting: "Good morning," = `Inter Regular 13` (caption); "Alex Rivera" =
  **`Inter Bold 28` (`title`) — NOT Playfair.**
- **Figma already solves the dual-primary collision the code regressed into**
  (one raised card, one teal primary, one outlined secondary).

**Progress — canonical frame `360:2` "Progress — Rebuilt":**
- **`KnowledgeMapBar`** (same 3-segment bar) + a **Known / Learning / New legend**
  (dots + labels) → **validates the Known/Learning/New breakdown**. "1,240 / 3,000
  known · Core 3,000" as a bold heading (Inter, not a giant Playfair number).
- Stats = **4 `ListRow`s** (`365:16`), not stat-tiles.

**The ring, XP, levels, weekly-activity chart, "Level Up!" — all live only in the
`Archive — pre-rebuild originals (do not ship)` sections** (`156:17`, `63:2296`).
They were **deliberately deleted** in the rebuild. Reviving any of them = minting the
"third design language" constraint 9 forbids.

**Figma component set to build against (all already exist as components in the file):**
`DailyCapMeter`, `KnowledgeMapBar`, `Streak`, `Button`, `ListRow`, `EmptyState`,
`TopBar`, `TabBar`, `Avatar`, `Chip`, `Field`.

**Observations to flag (not in this plan's scope):**
- Figma keeps a **rebuilt `Achievements` screen** (`374:98`, "6 of 12 unlocked" badge
  chips) + `Profile Overview` / `Edit Profile`. **No achievement/profile data exists
  in the code's model** — these are unbuilt *features*, not presentation fixes. Do
  NOT build badges into Progress as part of this level-up.
- Figma streak mocks show a `🔥` emoji — that's a Figma placeholder only; the app
  uses the Lucide `Icon` via `StreakBadge` (no-emoji rule holds).

---

## North Star

> **LexiTap should feel like a calm, premium reading tool that finally renders its
> own finalized design.** One focal point per screen (the depth tiers
> `bgSurfaceRaised`/`bgSurfaceSunken`, which the code leaves unused but Figma
> specifies). The teal gradient+glow spent once per screen. Progress shown as the
> segmented known/learning/new bar the design already chose — so the learner feels
> their known-word set growing. Motion that *confirms* progress rather than
> *performs* it. No guilt cue, no gamified flourish — the same calls the Figma
> rebuild already made when it deleted the XP/levels/ring/achievements-chart language.

Not Duolingo-loud. Things / Bear / Elevate restraint — which is what the finalized
Figma already is.

## Elevation principles (measure every change against these)

1. **One focal point per screen.** One `raised` card holds the single teal-gradient
   primary; the rest stay flat `bgSurface` with secondary/tertiary. (Figma Home
   already does this; the code regressed into two teal primaries.) Never two raised
   cards at once — gate mutually-exclusive states.
2. **Depth is meaning.** `bgBase`/`bgSurface`/`bgSurfaceRaised`/`bgSurfaceSunken` =
   a real z-hierarchy: raised = act-now, sunken = inset citation (examples), flat =
   context.
3. **Match Figma's type per screen — don't "spend Playfair" speculatively.**
   Verified: the Home greeting is Inter `title`, NOT Playfair. Playfair (`h1`/
   `display`) is used sparingly and **its placement must be confirmed in Figma before
   applying it** (the LearnCard word and the onboarding reveal are the likely homes —
   confirm on pages `238:5`/`238:2`, don't assume). Any localized/user string stays
   Inter (a serif face on Arabic/CJK is wrong). Max two type weights per screen.
4. **Scarce teal.** Gradient+glow primary `Button` once per screen; accent-as-graphic
   (meter fill, segment, left-spine, chip) is fine; accent-as-*text* uses `accentText`
   for AA.
5. **Motion confirms, never performs.** Every animation routes through `useMotion()`
   and degrades under Reduce Motion. Fill-grows, gentle transition, one settle on
   completion. No confetti, loops, or count-ups. **(Correctness — the synthesis got
   this wrong, the critic caught it: `useMotion().spring()` DOES return `{duration:0}`
   under Reduce Motion ([useMotion.ts:31](../mobile/src/presentation/theme/useMotion.ts#L31)).
   So hook-routed springs are already handled. A manual `!reduceMotion` guard is
   needed ONLY for RAW `withSpring(springs.x)` calls that bypass the hook. Don't
   sprinkle guards on hook-routed animations.)**
6. **Color never carries meaning alone (WCAG 1.4.1).** Every state change pairs color
   with an icon or text channel. Success green is a fill/icon, never body text.
7. **Never invent domain concepts.** Design only from data that exists: `streak` /
   `totalSessions` / `totalWordsMastered`, `getDailyProgress`, `getMasteryLevels` /
   `masteryCompletion` / `countMastered`, `getSavedWordCount`, `frontierRank` /
   `estimateKnownCount`. No milestones, badges, weekly rollups, phonetics, due-counts
   — none exist (this is why the Figma rebuild deleted the XP/achievements language).
8. **Honor the locked Rich Word Detail.** The felt `explanation` paragraph stays the
   star — full `textPrimary` body, above the examples, more prominent than the gloss.
   Elevate its *presentation* (air, measure, rhythm) only. ([memory 2026-06-09].)

---

## Decisions needed from Ryan

1. **Ship shape.** One big push, or tier-by-tier PRs (Tier 1 foundation → Tier 2/3
   screens)? **Default: tier-by-tier** — all presentation-layer, each EAS-Update
   shippable.
2. **~~RING vs bar~~ — RESOLVED against the live Figma. No ring.** The finalized
   design uses the **gradient `DailyCapMeter`** (Home daily goal) and the **segmented
   `KnowledgeMapBar` + Known/Learning/New legend** (Home + Progress). The ring lives
   only in the archived "do not ship" originals. The level-up = *implement these
   existing Figma components* the code never built — no Figma change needed, no third
   language. (Nothing for you to decide here; noted so the reversal is on record.)
3. **Onboarding scope (critic's #1 gap).** The endowed first-run reveal ("you already
   know ~X words," via the real `estimateKnownCount`) is the app's highest-emotion
   first impression and today is a caption. Redesign it as a real screen in this plan
   (Tier 5), matching whatever the finalized Figma onboarding page (`238:2`) actually
   specifies? **Default: include it as Tier 5, built to the Figma onboarding frame
   (I'll read `238:2` before speccing — not assume a ring/Playfair this time).**
4. **Coverage gap — screenshot/Figma pass on the un-checked surfaces.** I have
   app-screenshots for Home/Learn/Progress/Settings/exit/all-caught-up and have now
   read the Home/Progress Figma. **QuizScreen, LearnQuickCheck, PaywallScreen, and
   Onboarding still need a Figma+screenshot pass** before speccing (Paywall
   single-primary audit; the "caution-not-red" quiz feedback moment). **Default: land
   Tiers 1–3, then a second pass reading their Figma frames + fresh app screenshots.**
5. **Confirm three cuts** (I'm overruling the workflow — they contradict either the
   calm-voice north star or the finalized Figma): the **streak count-up flame-pulse**,
   the **SessionComplete stagger cascade**, and the **MasteryRing**. See
   [Cut / rejected](#cut--rejected).

---

## Tier 0 — Tactical fixes (already planned, DO NOT restate)

All 24 phases in [`UI_UX_FIXES_PLAN.md`](UI_UX_FIXES_PLAN.md). Table stakes. Several
are absorbed/superseded by richer work here (example cards → sunken-well citations;
sticky footer → `Screen` footer slot; Learn recap → recap parity). Where they
overlap, the elevation version wins; otherwise land the tactical fix as-is.

---

## Tier 1 — Foundation (highest impact-per-effort; unblocks everything)

Systemic, additive (optional props, zero effect when unused). Build first.

### Phase 1.1 — Load the fonts (P0)
- `mobile/package.json`: add `@expo-google-fonts/playfair-display` +
  `@expo-google-fonts/inter`.
- [`app/_layout.tsx`](../mobile/app/_layout.tsx): `useFonts([PlayfairDisplay_700Bold,
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold])`; hold render
  behind `SplashScreen.preventAutoHideAsync()` until fonts **and** the existing
  `services` container both resolve (fold into the spinner seam at lines 69–72);
  `hideAsync()` when ready.
- **Done means:** `npm run check` GREEN + **on-device** screenshot proving Inter/
  Playfair actually paint (a Playfair double-story `g` is the serif tell). Local
  tests can't see typefaces — device is the only acceptance.

### Phase 1.2 — Card depth variants (raised focal + interactive spring-press)
- [`Card.tsx`](../mobile/src/presentation/components/Card.tsx): add optional
  `interactive` + `onPress` — wraps children in a reanimated `Animated.View` reusing
  Button's snap-spring press-scale (0.97); `minHeight ≥ 48` +
  `accessibilityRole="button"` **only when `onPress` present**. Keep `raised` as-is.
- **Done means:** `npm run check` GREEN; default path visually unchanged.

### Phase 1.3 — `usePressScale` hook (extract from Button)
- Factor Button's `scale`/`opacity` shared values + press handlers into a shared hook
  / `PressableScale`. Apply to every tappable that only drops opacity today (LearnCard
  bookmark, Progress rows, `ListRow`). Bookmark → 0.88 + padding bump to clear 48px.
- **Done means:** `npm run check` GREEN; uniform tactile response app-wide.

### Phase 1.4 — Animated ProgressBar with completion cue (foundation for the meters)
- [`ProgressBar.tsx`](../mobile/src/presentation/components/ProgressBar.tsx): Paper's
  fill can't animate from outside — add an absolutely-positioned `Animated.View` in
  the existing `overflow:hidden` track; interpolate width `0→value` on mount AND on
  value change via `useMotion().timing('base')`. Add `tone: 'accent' | 'success'`. At
  `progress ≥ 1` flip to `success` **and** render a `check` `Icon` / update the label
  (color alone fails 1.4.1). Keep `accessibilityRole="progressbar"` +
  `accessibilityValue` on the OUTER `View`, **update `now` on value change**.
- Also fix `SegmentedProgress` token purity
  ([ProgressBar.tsx:60–111](../mobile/src/presentation/components/ProgressBar.tsx#L60)):
  hardcoded `rgba(255,255,255,0.10)` → `colors.borderSubtle`; drop the `className`.
- **Done means:** `npm run check` GREEN + screenshots (mid-fill, completed green+check).

### Phase 1.5 — `KnowledgeMapBar` + `DailyCapMeter` (build to the Figma components)
The two viz components the finalized Figma specifies and the code never built.
- **`DailyCapMeter`** (Figma `300:14`): a ~34px horizontal meter with a **teal
  gradient fill** (`expo-linear-gradient`, same `#20B2AA→#178F88` as the primary
  Button), animated `0→value` via `useMotion().timing('base')`, `accessibilityRole=
  "progressbar"` + a "X of Y reviews" label. Richer than the flat 8px `ProgressBar`.
- **`KnowledgeMapBar`** (Figma `300:28` / `360:13`): a **3-segment** bar — `success`
  (known) / `accent` (learning) / `borderSubtle`→gray (new) — widths from the
  `MasteryLevel[]` distribution (known = level 5, learning = levels 1–4, new =
  remainder; **confirm the exact `MasteryLevel` enum boundaries against `domain/srs`
  at build** — a read, not a write). Combined a11y label ("1,240 of 3,000 known").
  Pair with the legend (dots + `success`/`accent`/gray + labels, Figma `360:17`).
- **Done means:** `npm run check` GREEN + screenshots matching Figma `300:2`/`360:2`.
- **Unlocks:** Home daily goal + Core-3000, Progress hero, onboarding reveal.

### Phase 1.6 — Screen sticky-footer slot (measured, safe-area-correct)
- [`Screen.tsx`](../mobile/src/presentation/screens/Screen.tsx): add optional
  `footer?: ReactNode` + `contentStyle?: ViewStyle`. **Measure** footer height via
  `onLayout` → feed `contentContainerStyle.paddingBottom` (never hardcode). Render
  footer INSIDE `SafeAreaView`; apply the bottom inset **exactly once**. No-op when
  `scroll={false}`. **Regression-test EVERY screen** (all use `Screen`).
- **Done means:** `npm run check` GREEN + all-screens smoke; then anchors the
  LearnCard "Got it" + Home CTAs. (Supersedes tactical Phase 5.)

### Phase 1.7 — Shared primitives: EmptyState / SectionHeader / ListRow
- Three small new files matching the Figma components.
  - **`EmptyState`** (icon + headline + body + optional CTA) — Figma `EmptyState`
    (`302:75`, `377:135`). Every empty screen.
  - **`SectionHeader`** (`smallCaps` eyebrow) — consolidates the inline
    `MEANING n`/`EXAMPLES` labels + dashboard reading-order eyebrows.
  - **`ListRow`** — enforces `minHeight: layout.minTouchTarget` (48). **Fixes a LIVE
    a11y bug:** the Saved-words `Pressable` at
    [`ProgressScreen.tsx:120–137`](../mobile/src/presentation/screens/ProgressScreen.tsx#L120)
    has no `minHeight`. Figma uses `ListRow` for Home rows, Progress stats, Profile,
    Settings. **Destructive caveat:** `destructive` `#E5484D` on `bgSurface` ≈4.47:1
    (below 4.5:1 — verify) → destructive labels ≥18px or on `bgBase`.
  - *(No `StatTile` — the finalized Figma renders Progress stats as `ListRow`s, not
    tiles. Dropped.)*
- **Done means:** `npm run check` GREEN + render tests (`ListRow` min-height, `EmptyState`).

---

## Tier 2 — The two screens that carry the product's feeling (realign to Figma)

### Phase 2.1 — HomeScreen → match `300:2`
Diagnosis: three near-identical flat cards; daily-cap a buried 8px bar; **two
`primary` teal-glow buttons at once** when a session is in flight
([HomeScreen.tsx:116](../mobile/src/presentation/screens/HomeScreen.tsx#L116)+[144](../mobile/src/presentation/screens/HomeScreen.tsx#L144)).
The finalized Figma already fixes all of this — realign to it.
1. **One raised focal card + single primary** (match Figma). "Words ready to review"
   is `raised` and carries the single teal `Start review`; "Core 3,000" is flat with
   an **outlined `Keep learning`**; Resume (when in-flight) is the focal card instead.
   Compute `primaryAction = resume ?? review ?? learn`; only it is `primary`.
   (Absorbs tactical Phase 1.)
2. **`DailyCapMeter`** (Phase 1.5) for the daily goal, replacing the 8px bar; fill =
   `min(reviewsCompletedToday/effectiveDailyCap, 1)` — exact existing expression, zero
   new data.
3. **`KnowledgeMapBar`** (Phase 1.5) for "Core 3,000 known" + the "1,240 / 3,000
   known · Core 3,000" line (Inter heading, per Figma).
4. **Card rhythm.** `contentStyle={{ gap: spacing.s4 }}` on `<Screen>` so the gap
   lands *between* sibling cards.
5. **Greeting = Inter `title`** ("Good morning," caption + name `title`), **not
   `display`/Playfair** — matches Figma. Streak as the `Streak` component top-right.
6. **Completed + resume states.** At cap: `DailyCapMeter` flips to `success` + check +
   "Today's reviews are done" (no red, no dead CTA — Figma has an "All Caught Up"
   variant `302:55` to match). Resume caption shows next word via
   `activeSession.batch[Math.min(index, batch.length-1)].word` (**`.word`, not
   `.headword`** — that field doesn't exist). Animate meter `0→current` on FIRST mount
   only; `prev→current` on `refreshSignal` (store `prev` in a ref).
- **Read-failure honesty (critic gap):** `load()` swallows read errors into
  `stats=null` → today that looks identical to a brand-new user. On a *read failure*
  for a returning learner, show a neutral "couldn't load — retry", distinct from a
  genuine zero.
- **Done means:** `npm run check` GREEN + screenshots (fresh, mid-day, at-cap,
  resume, forced read-failure) that visually match Figma `300:2`.

### Phase 2.2 — ProgressScreen → match `360:2`
Diagnosis: a numbers dump ("Longest: X · Sessions: Y · Mastered: Z" + a 1px sliver +
"0 of 2848 mastered"). The finalized Figma is a clean known-words dashboard.
1. **`KnowledgeMapBar` + Known/Learning/New legend** (Phase 1.5) as the hero, with the
   "1,240 / 3,000 known · Core 3,000" bold Inter heading — exactly Figma `360:2`. This
   turns the demoralizing "0 of 2848" into a visible composition (New-heavy on day one
   is honest, not a scold).
2. **Stats as `ListRow`s** (longest streak / sessions / mastered / …), matching Figma
   `365:16` — replaces the run-on line. Only the 3 real `UserStats` fields; the fourth
   row can be `getDailyProgress`-derived "reviewed today" (existing data).
3. **Fix the Saved-words touch target** → `ListRow` (48px). Live WCAG-2.2 fix.
4. **`Streak` component** + `SectionHeader` eyebrows for reading order. First-run
   (`totalSessions === 0`): `KnowledgeMapBar` at all-New as an *invitation* + endowed
   copy, no invented badges. At-risk streak uses the **`caution`** token + soft copy,
   never `destructive`/alarm.
- **Done means:** `npm run check` GREEN + render tests (Known/Learning/New split,
  first-run) + screenshots matching Figma `360:2`.

---

## Tier 3 — The heart screen + session closure

### Phase 3.1 — LearnCardScreen: premium reader
(Check page `238:5` "04 · Learn Loop" / `238:8` Word Detail `359:2` in Figma before
building — memory says the multi-sense Word Detail is already rebuilt there; match it.)
1. **Two-tier header.** Tier 1 = full-bleed thin progress line (`ProgressBar
   height={4}`); tier 2 = compact control row (Back as `x` Icon + counter + bookmark).
   Keeps the exit-sheet trigger; Back keeps 48px via padding+hitSlop. (Absorbs
   tactical Phase 3.)
2. **Examples as sunken-well citations.** Wrap each in a `bgSurfaceSunken` card (unused
   token) with a 2px `accent` left-spine; **bold the target word** (case-insensitive
   split; fall back to the plain sentence when inflected/absent — never crash); drop
   italic. `textSecondary` on `bgSurfaceSunken` ≈9.08:1 AA. (Absorbs/supersedes
   tactical Phase 4.)
3. **Typographic ladder** (word → gloss → explanation). Word to `variant="h1"`
   (confirm Playfair-vs-Inter for the word against Word Detail `359:2` — the code uses
   `display` today; match Figma), **delete the redundant inline `fontWeight` override**
   ([LearnCardScreen.tsx:314](../mobile/src/presentation/screens/LearnCardScreen.tsx#L314)),
   add `marginTop s3` above the explanation. **No phonetic line — `word.phonetic`
   doesn't exist on the `Word` type.**
4. **Felt-explanation type spec (critic gap — the locked star needs its own
   treatment).** Cap measure to ~66ch against `layout.contentMaxWidth` (600); `bodyLg`
   (18/26) with generous paragraph rhythm + a defined vertical-air ratio to the gloss.
   Role unchanged (still `textPrimary`, still the star) — only reading rhythm specified.
5. **Multi-sense meaning cards.** Wrap each sense in a `Card`; remove the manual
   hairline divider. Single-sense path stays flat. (Match Word Detail `359:2`.)
6. **Gentle advance = cross-fade** (revised — see Cut/rejected). Keyed word-body via
   `FadeOut.duration(motion.fast)`/`FadeIn.duration(motion.base)`, **not** a horizontal
   page-slide. Move SR focus to the new word after swap.
7. **"All caught up" as accomplishment.** `EmptyState`: `check` 40 `success`,
   warm body, unconditional "Back to Home" (`router.replace('/')`). **Do NOT gate a
   "Review now" on `reviewsCompletedToday < cap`** — a done-count, not a due-count; no
   due-count query exists. Split budget-reached vs pool-exhausted copy. (Absorbs
   tactical Phase 20.)
- **Deferred rider — Listen pill.** `audioPath` is null on every word today
  ([LearnCardScreen.tsx:318](../mobile/src/presentation/screens/LearnCardScreen.tsx#L318)
  is a `console.log` stub). A visible dead stub is a liability — hide it until audio is
  wired; don't polish a control that renders on zero words.
- **Done means:** `npm run check` GREEN + render tests + screenshots (single/multi-
  sense, empty) matched against Word Detail `359:2`.

### Phase 3.2 — Learn recap parity (fixes "I can't find the words I know")
- [`learn-check.tsx`](../mobile/app/learn-check.tsx) hard-cuts to Home
  (`onComplete = router.replace('/')`) while the review flow has `SessionCompleteScreen`.
  Render a recap **after `LearnQuickCheck`** (the SRS-writing step), via a new `recap`
  phase.
- **Source by reading** (no new query, presentation-only): `getUserStats()` for
  `currentStreak`; **`streakIncremented = false`** (the learn flow doesn't own streak
  increments — verified); `wordsReviewed = batch.length`; `moreItemsAvailable = false`.
  Optional `variant: 'learn'` → headline "You met N new words today."
- Ship minimal (count + streak + Done); the word-list re-entry retargets to the
  "Learned" list once [`WORD_LISTS_PLAN.md`](WORD_LISTS_PLAN.md) ships. (Absorbs
  tactical Phase 19.)
- **Done means:** `npm run check` GREEN + render test + screenshot; verify resume
  (`?resume=1`) does NOT route through the recap.

### Phase 3.3 — SessionComplete as an earned moment
- [`SessionCompleteScreen.tsx`](../mobile/src/presentation/screens/SessionCompleteScreen.tsx):
  contain the 5 loose elements in a `raised` Card. Check icon scales `0.6→1.0` via
  `withSpring(springs.settle)` **in sync with the existing mount haptic**. **Gate the
  spring on an explicit `!reduceMotion` branch** (mount at scale 1) — raw `withSpring`
  ignores `duration:0`. **NO stagger cascade** (one settle, per principle 5).
- **Done means:** `npm run check` GREEN + screenshot; Reduce-Motion mounts static.

---

## Tier 4 — Voice, delight & hygiene polish

### Phase 4.1 — Unify empty/done microcopy voice
One contract across `SessionComplete` / Quiz-empty / Learn-empty / SavedWords-empty /
`ForgivenessSheet` (four registers today). Audit `LearnQuickCheck` AFFIRM/CORRECTION
arrays. Copy-only; document in `lexitap-docs/03-ux-design/`.

### Phase 4.2 — ExitSessionSheet as a calm decision
Lead with "Take a break?"; "Leave" → "Pause for now" (honest — the snapshot is
resumable). (Absorbs tactical Phases 22–24; **run tactical Phase 21 first** — the
"Leave" button's plain-text look is a suspected stale build; source already codes it
`secondary fullWidth`, verified.)

### Phase 4.3 — SavedWords + first-run endowed states
SavedWords empty → `EmptyState` with the real `bookmark` glyph. First-run Home/Progress
use `estimateKnownCount(frontierRank, poolSize)` (real helper, used at O-5) for endowed
copy. **Gate first-run hero vs raised Resume card as mutually exclusive** (principle 1).
Also: Saved-words section is gated behind `savedCount > 0` — a learner who never saved
never learns the affordance exists (flag for a discoverable zero-state).

### Phase 4.4 — Settings hygiene
Route rows through `ListRow` (48px) + `SectionHeader`. Destructive Delete Account
label ≥18px or on `bgBase`. (Composes with tactical Phases 14–17.)

---

## Tier 5 — Onboarding endowed reveal (critic's #1 missing move)

The biggest emotional-payoff moment — first-run "you already know ~X words"
(`estimateKnownCount`) — is a caption today. **Read the finalized onboarding frame
(page `238:2`) first**, then build the reveal to match it (likely the `KnowledgeMapBar`
sweep + the Figma-specified type — **not** a ring/Playfair assumption, given how the
Home check went). Gated on Decision #3.
- **Done means:** screenshot vs Figma `238:2` + `npm run check` GREEN.

---

## Explicit coverage gaps — need a Figma+screenshot pass (Decision #4)

Named, not silently omitted:
- **QuizScreen answering moment** (option cards + caution-not-red correction) — the
  `Card interactive` primitive is what option cards need. Read its Figma frame first.
- **LearnQuickCheck** — the SRS-writing recognition screen.
- **PaywallScreen** — highest teal-density screen; audit the single-primary rule
  (same dual-glow bug caught on Home may exist). Read Figma `238:10`/purchase `238:10`.
- **Loading states** — the font splash-hold + QuizScreen loading + Home zero-flash all
  pop from empty→real. A designed skeleton, not a bare spinner.
- **Light-theme AA** — every pairing here is dark-canonical; the derived `lightColors`
  need their own pass for the raised-card / sunken-well / accentText / destructive-row
  pairings.
- **Dynamic Type reflow** — the denser hero + meters at max text size on small screens.

---

## Locked-decision compliance (what this plan deliberately does NOT do)
- **Rich Word Detail felt explanation stays the star** — LearnCard changes elevate its
  surround (air, sunken examples, its own measure spec); role/prominence untouched.
- **No emoji** — Lucide `Icon` only; every referenced glyph verified present or flagged
  for the Lucide-source add recipe (`refresh-cw`/`sparkles` are absent — use
  `bar-chart-2`/`circle`/`book-open`/`check`).
- **No TextInput** on learn/quiz screens (passive recognition).
- **Single teal** — scarce-teal *reduces* teal; no new colors.
- **No proficiency picker** (D1). **No badges/XP/levels** (deleted in the Figma rebuild
  for the same reason — the Achievements frame in Figma has no data behind it).
- **48px + WCAG AA** — every pairing states its tokens; `ListRow` fixes a live sub-48 bug.
- **No domain concepts invented** — Known/Learning/New is *counting* existing
  `MasteryLevel[]`.
- **No high-risk path** — presentation-only reads of existing use-case output; nothing
  writes `domain/srs`, `infrastructure/db`, or `infrastructure/analytics`.

## Cut / rejected
- **MasteryRing** — **contradicts the finalized Figma** (ring is archived "do not
  ship"; canonical uses `DailyCapMeter`/`KnowledgeMapBar`). Building it would mint the
  third design language constraint 9 forbids. The workflow proposed it; the Figma
  overruled it.
- **Playfair on the Home greeting** — Figma uses Inter `title` 28; verified. Don't
  spend Playfair speculatively; confirm per-screen in Figma.
- **StatTiles on Progress** — Figma uses `ListRow`s for stats.
- **Streak count-up flame-pulse** — performs celebration the calm voice forbids (a
  streak is a calendar fact, not a session achievement). Cut, not deferred.
- **SessionComplete stagger cascade** — contradicts its own "one settle" principle.
- **Horizontal page-turn slide on LearnCard** — skeuomorphic theater; cross-fade instead.

## Motion correctness
`useMotion().spring(preset)` and `.timing(token)` BOTH return `{duration:0}` under
Reduce Motion ([useMotion.ts:26–41](../mobile/src/presentation/theme/useMotion.ts#L26)).
Hook-routed animations are already handled — do NOT add `!reduceMotion` branches to
them. The manual guard belongs ONLY on raw `withSpring(springs.x)` (Phase 3.3, raw
reanimated layout animations) — `withSpring` ignores `{duration:0}`.

## Figma source-of-truth reconciliation (constraint 9)
**Everything in this plan REALIGNS code to the already-finalized Figma** — the
`DailyCapMeter`, `KnowledgeMapBar`+legend, `ListRow`, `EmptyState`, single-raised-focal-
card, single-teal-primary, and Inter-`title` greeting all already exist there. **No
Figma change is required** for Tiers 1–2. Confirm the remaining screens against their
frames before speccing (LearnCard/Word-Detail `359:2`, onboarding `238:2`, quiz/paywall).
The only *net-new-vs-Figma* items are presentation plumbing (the `Screen` sticky-footer
slot, the animated-completion `success`+check on the meters) — cosmetic, no third
language. Access confirmed working this session (Dev Mode MCP; keep the LexiTap file
the active tab in the Figma desktop app to re-read).

## Risks / gotchas
- **1.1 font load is unproven until a device confirms glyphs paint** — device-only.
- **1.6 `Screen` footer touches every screen** — additive/optional, but run the FULL
  suite + all-tabs smoke.
- **1.5 `KnowledgeMapBar` boundaries** must match the real `MasteryLevel` enum in
  `domain/srs` — confirm at build (a read, low-risk, but a wrong boundary mislabels
  progress).
- **Contrast is dark-canonical** — light-theme AA is a named gap.
- **Per AGENTS.md: local-green ≠ CI-green** — confirm CI per tier.
- **Concurrent-session hazard** — many `presentation/` files + shared `Screen.tsx`/
  `Card.tsx`/`ProgressBar.tsx`. One owner per shared component; no `git add -A`.

## Docs to update on completion
- **CLAUDE.md / AGENTS.md** — new reusable patterns (`DailyCapMeter`, `KnowledgeMapBar`,
  `Card interactive`, `Screen footer`, `usePressScale`, `ListRow`/`EmptyState`/
  `SectionHeader`) + the motion reduce-motion rule.
- **`lexitap-docs/03-ux-design/DESIGN_SYSTEM.md`** — north star + 8 principles + the
  empty/done voice contract.
- **`memory/MEMORY.md`** — session note; and **record the font-loading P0** (silently
  degraded the whole type system, no test caught it, device-only-verifiable) and the
  **ring-vs-bar Figma reconciliation** (canonical = meters, ring is archived).
- **`.design-specs/FIGMA.md`** — no change needed (code realigns to Figma), but note
  which code components map to which Figma components once built.
- **`ORCHESTRATION.md` / `ROADMAP.md`** via `/orchestrate sync` if this becomes tracked.
