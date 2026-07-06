# UI/UX Fixes — Home CTA/status-bar, Learn Card readability/nav, Progress dashboard, Settings cleanup

**Status:** draft (2026-07-05) — pending Ryan's accept.
**Goal:** Fix concrete, verified UI defects across Home, Learn Card,
Progress, and Settings — CTA collision, unreadable status bar, cramped
header, blended examples, dead space after the CTA, a weak button label, a
missing prev/next affordance in Learn Card, a Progress screen that shows
numbers but offers no forward action or empty-state guidance, a Settings
screen with a low-contrast toggle, a double-negative label, and a misplaced
destructive action, and a mid-session exit sheet whose copy reads as
reassurance instead of the decision it's actually gating. Explicitly does **not** touch the felt-explanation
teaching content, does not add assessment to Learn Card, does not
reintroduce a manual proficiency picker, does not build new gamification/
domain concepts (badges, weak-word detection, milestones) disguised as UI
fixes, and does not build a sticky/collapsing header for Settings (the
"title disappears" complaint is normal scroll behavior, not a bug).
**Issue:** none — user-initiated, not in ORCHESTRATION.md/ROADMAP.md.

**Part of a bigger arc:** this is **Tier 0 (table stakes)** of
[`DESIGN_LEVELUP_PLAN.md`](DESIGN_LEVELUP_PLAN.md) — the design-elevation plan that
turns "less broken" into "premium" (north star, systemic component upgrades, per-screen
redesigns, the verified font-loading P0). These 24 phases are the verified bug fixes;
several are absorbed/superseded by the richer Tier 1–3 work there (example cards →
sunken-well citations, sticky footer → `Screen` footer slot, Learn recap → recap
parity). Where they overlap, the elevation version wins; where they don't, land the
tactical fix as-is.

**Origin:** four design critiques this session (Home screenshot, Learn Card
screenshot for "arrive", Progress screenshot, Settings screenshots ×2), each
pressure-tested in chat before planning — several points across all four
were rejected as false, cosmetic, feature invention, or in direct conflict
with locked product decisions or existing accessibility commitments.
Rejections are not re-litigated here; see [Out of scope](#out-of-scope) for
the list and the one-line reason each was cut.

---

## Decisions (Ryan, 2026-07-05)
- Home primary CTA = **Start review**, always. Resume is demoted, never competes.

## Decisions needed from Ryan
1. **Learn Card button label:** "Next" vs "Next word" (both fit the
   pressure-free, no-assessment framing; "Practice This Word" / "I Know
   This" are rejected — see Out of scope). Default if no answer: **"Next"**.
2. **Word nav interaction model:** left/right chevrons near the counter vs.
   swipe gesture vs. both. Default if no answer: **chevrons only** (swipe
   risks conflicting with the exit-sheet's back-swipe-to-dismiss on iOS, and
   is invisible/undiscoverable without a hint).
3. **Proficiency picker ask (Ryan's, from chat):** this plan does **not**
   include it — it conflicts with the locked D1 decision (proficiency screen
   cut in favor of the adaptive diagnostic, 2026-05-31). If you still want a
   manual override, the honest version is a Settings "re-run diagnostic" /
   "adjust my level" affordance, which is a separate, larger feature (touches
   `domain/onboarding/adaptiveDiagnostic.ts` + onboarding_state) — not folded
   into this UI-fix plan. Say the word and it becomes its own plan.
4. **Foundation Pack card's tap target (Phase 8):** should tapping it push
   `/learn` directly (skip Home, start the next learn batch immediately —
   fastest path to the "next action" the critique wants) or `router.push`
   back to the Study tab (`(tabs)/study-session.tsx`, letting Home decide
   Resume/Start review/Learn)? Default if no answer: **push `/learn` directly**
   with `tierId: DEFAULT_TIER` — same params `(tabs)/study-session.tsx`
   already uses for `onLearnNewWords` (line 48) — since the card is
   specifically about the Foundation Pack, not review.
5. **Progress empty-state threshold:** trigger on `stats.totalSessions === 0`
   (never studied) or on `stats === null` (read failure) too? Default if no
   answer: **`totalSessions === 0` only** — a read failure should stay
   fail-soft/silent per the screen's existing offline-first pattern (`catch`
   → `null` → zeroed fallback), not surface a false "you haven't started"
   message to a user who actually has progress the app just failed to read.
6. **Settings Privacy toggle off-state colors:** exact replacement for
   `thumbColor: colors.bgSurface` / `trackColor.false: colors.borderSubtle`
   (lines 386–387) — needs a token pairing that's visibly "off" against the
   card background without inventing a new color. Default if no answer:
   `thumbColor: colors.textTertiary` (off) / `colors.accent` (on, unchanged),
   `trackColor: { false: colors.bgSurfaceRaised, true: colors.accentSubtle }`
   (unchanged on-state) — reuses existing tokens, just swaps the off-state
   pairing for contrast.
7. **Settings analytics row final copy:** "Share usage analytics" vs plain
   "Analytics" as the label. Default if no answer: **"Share usage analytics"**
   (the critique's own clearer option — states the action, not just the topic).
8. **Learn-session recap screen scope (Phase 19):** show just a count ("10
   new words learned today," mirroring `SessionCompleteScreen`'s pattern) or
   the actual word list (each word + short gloss)? Default if no answer:
   **the actual word list** — the whole complaint driving this phase is
   "I can't find the words I know," so a bare count doesn't fix it; the
   learner needs to actually see the words.
9. **Phase 19 build approach:** extend `SessionCompleteScreen` to cover both
   flows, or build a separate `LearnSessionCompleteScreen`? Default if no
   answer: **separate screen** — `SessionCompleteScreen` is spec'd/tested
   around a review-session shape (accuracy-free count + streak); forcing a
   word list into it risks regressing the quiz flow's existing behavior for
   a screen this plan doesn't otherwise need to touch.
10. **ExitSessionSheet scrim opacity (Phase 23):** current `rgba(0,0,0,0.5)`
    (line 106) is heavier than the sheet's own "calm, no-guilt" design intent
    warrants. Default if no answer: **`rgba(0,0,0,0.35)`** — visibly present,
    lighter than a destructive-confirm dialog would use.

---

## Ground truth (read before touching anything)

### Home screen
[`HomeScreen.tsx`](../mobile/src/presentation/screens/HomeScreen.tsx):
Resume card already renders conditionally (only when an active session
exists); the actual bug is Resume's button is `variant="primary"`, identical
to Start review's `variant="primary"` — two solid teal CTAs stacked.
"Start learning" is already `variant="secondary"` (outlined) — not a plain
text link as the original critique claimed.
[`Button.tsx`](../mobile/src/presentation/components/Button.tsx) already has
4 variants (`primary`/`secondary`/`tertiary`/`destructive`) — no new variant
needed, just change Resume's prop value.

[`mobile/app/_layout.tsx:68`](../mobile/app/_layout.tsx#L68) hardcodes
`<StatusBar style="light" />` for every screen, regardless of theme.
[`ThemeProvider.tsx`](../mobile/src/presentation/theme/ThemeProvider.tsx)
already resolves and exposes `theme.scheme` (`'dark' | 'light'`) via
`useTheme()` — the fix reads that instead of hardcoding.

### Learn Card
[`LearnCardScreen.tsx`](../mobile/src/presentation/screens/LearnCardScreen.tsx):
- Header row (lines 266–303): `Back` (tertiary button, opens
  `ExitSessionSheet` — **not** "previous word", `accessibilityLabel="Leave
  session"`) + `ProgressBar` (`flex: 1`) + `"{position}/{total}"` counter +
  bookmark `Pressable`, all in one row with `gap: spacing.s3`. Cramped —
  confirmed from the screenshot, cheap to fix with spacing/height changes.
- `ProgressBar` ([ProgressBar.tsx](../mobile/src/presentation/components/ProgressBar.tsx))
  already takes a `height` prop (default 8) — "thinner" is a prop change,
  not new code.
- Bookmark (save word) is **already built** — the checkmark-square icon
  top-right in the screenshot IS the save-word feature
  (`isWordSaved`/`saveWord`/`unsaveWord`, lines 143–169). Not a gap.
- Audio ("Listen") button is **already scaffolded** (`word.audioPath != null`
  gate, lines 318–329) but playback is a stub (`console.log`, line 326) —
  hidden entirely on words without an `audioPath` (e.g. "arrive" in the
  screenshot). Wiring real playback is out of scope here (separate,
  content/audio-pipeline-sized task) — not a Learn Card UI bug.
- Examples render as plain italic `Text` in a `View` with `gap: s1`
  ([lines 372–388](../mobile/src/presentation/screens/LearnCardScreen.tsx#L372-L388))
  — no card, no bolding of the target word. Confirmed blending into the
  page as the critique said.
- CTA ([lines 414–425](../mobile/src/presentation/screens/LearnCardScreen.tsx#L414-L425))
  sits inline inside `Screen`'s `ScrollView` (see
  [Screen.tsx](../mobile/src/presentation/screens/Screen.tsx) — no
  sticky-footer support exists yet). On short content (single-sense words,
  no examples) this produces the dead space under the button seen in the
  screenshot. Fixing this is a real (small) architecture change: `Screen`
  needs a `stickyFooter` slot, or Learn Card stops using `Screen`'s built-in
  scroll and composes its own `ScrollView` + fixed footer `View`.
- **No word-by-word navigation exists.** `handleGotIt` (lines 171–182) only
  moves forward; there's no `handlePrevious` and no way to revisit a card
  already advanced past. `Back` is fully claimed by "leave session" — reusing
  that label for "previous word" would break the exit-sheet trigger.
- `sense.explanation` (the paragraph) is `textPrimary` (page's most
  prominent text color) and `sense.shortGloss` is `textSecondary` (line
  362–369) — i.e. **the paragraph is already styled as the more prominent
  element, by design.** This is the Rich Word Detail feature's entire
  premise (felt explanation "so the learner internalizes the word" — Ryan
  approved the prose bar and explicitly rejected cheap/bulleted generated
  text as slop, [memory 2026-06-09](../memory/2026-06-09_phase4-and-learn-loop-disconnect.md)).
  Confirms the critique's framing (paragraph "competes with" / "should be
  replaced by" the short gloss) is backwards from the actual design intent.

### Progress
[`ProgressScreen.tsx`](../mobile/src/presentation/screens/ProgressScreen.tsx):
- **Saved Words card (lines 119–137) is already fully tappable** — `Pressable`,
  chevron-right icon, `router.push('/saved-words')`, a11y label. Not a gap.
- **Foundation Pack card (lines 139–151) has zero interactivity** — plain
  `View` in a `Card`, no `Pressable`, no `onPress`, no chevron. Confirms the
  critique: this one genuinely looks and behaves like a dead info card, unlike
  its sibling two lines up.
- Mastery line is literally `${tier.mastered} of ${tier.total} mastered`
  (line 147) — for Foundation Pack that's "0 of 2848 mastered" verbatim, no
  framing at all. Confirmed as written, not exaggerated by the critique.
- `ProgressBar`'s `label` prop ([ProgressBar.tsx](../mobile/src/presentation/components/ProgressBar.tsx))
  is accessibility-only (`accessibilityLabel`) — nothing renders visibly on
  screen. "0% complete" would need a new sibling `Text`, not a prop tweak.
- **No empty state exists.** The screen always renders real (possibly all-zero)
  numbers; there's no branch for "user has never studied," unlike Home's
  `NoWordsAvailableError` → "All caught up" pattern or LearnCard's own empty
  phase. Adding one here is applying an existing app pattern, not inventing one.
- `UserStats` ([UserStats.ts](../mobile/src/domain/user/UserStats.ts)) only
  has `streak`, `totalSessions`, `totalWordsMastered` — **no weekly rollup,
  no milestone concept, no weak-word tracking.** Confirms "words learned this
  week" / "next milestone" / "weak words to review" / "achievement badges"
  all need new domain queries or concepts — real feature work, not a UI fix.
- `DailyProgressMetrics` (via `queries.getDailyProgress`, already used on
  [HomeScreen.tsx](../mobile/src/presentation/screens/HomeScreen.tsx) lines
  69–83) already computes `reviewsCompletedToday` / `newWordsCompletedToday`
  / budgets — reusable here for a cheap "Today" line without a new query.
- Home's route ([`(tabs)/study-session.tsx`](../mobile/app/(tabs)/study-session.tsx)
  lines 44–50) pushes `/learn` with `{ tierId: DEFAULT_TIER }` for "Learn new
  words" and `/quiz` with `{ tierId, mode: 'review' }` for "Start review" —
  these are the existing route/param shapes Phase 8's tap target should reuse.

### Settings
[`SettingsScreen.tsx`](../mobile/src/presentation/screens/SettingsScreen.tsx):
- **"Title disappears" (critique #1) is not a bug.** The `Settings` title
  (lines 261–263) is a normal first child of `Screen`'s default `ScrollView`
  (same as Home/Progress) — screenshot 2 is simply scrolled down. No
  collapsing-header logic exists anywhere in the app to be "inconsistent."
- **Bottom padding (critique #2/#11) is mostly not real either.**
  [`(tabs)/_layout.tsx`](../mobile/app/(tabs)/_layout.tsx)'s `tabBarStyle`
  has no `position: 'absolute'` — React Navigation already reserves the tab
  bar's own space; content does not render underneath it. Neither screenshot
  shows actually-truncated text. The requested 90–110px fix is based on a
  wrong model (would double-pad space the tab bar already claims).
- **Privacy toggle contrast (critique #6) is real** — off-state is literally
  `thumbColor: colors.bgSurface` on `trackColor.false: colors.borderSubtle`
  (lines 386–387), i.e. near-background-color-on-near-background-color.
  Confirmed washed out, matches the screenshot.
- **"Disable Analytics" (critique #7) is a real double-negative** — off
  means analytics ARE running, which reads backwards. The underlying stored
  flag is `analyticsOptOut` ([`AnalyticsOptOutStore`](../mobile/src/infrastructure/analytics/AnalyticsOptOutStore.ts)),
  read elsewhere as the PII/analytics gate (CLAUDE.md High-Risk Path,
  `infrastructure/analytics/`) — the fix must invert only the **displayed**
  switch value/handler in this file, never the stored semantics or any other
  consumer of `analyticsOptOut`.
- **Delete Account under Legal (critique #9/#10) is a real IA miss** — it's
  an account action (lines 418–423, inside the `Legal` `Card`, lines
  398–424), not a legal document. Confirmed from source, not just the
  screenshot's visual grouping.
- **Appearance pills (critique #5) already use `minHeight: 44`** (line 340)
  — the app's own accessibility pass already establishes 44×44 as the touch
  target floor (memory, 2026-06-09 design revision: hitSlop additions exist
  specifically to *reach* 44×44). Shrinking below that reverses a
  documented, deliberate accessibility commitment.

### Learn flow: session-complete recap + "All caught up" clarity
[`learn-check.tsx`](../mobile/app/learn-check.tsx): `LearnQuickCheckScreen`'s
`onComplete={() => router.replace('/')}` fires straight back to Home — **no
recap of what was just learned, ever**, for the Learn flow. Confirmed real,
not a misreading: the Review/Quiz flow already has exactly this
("`SessionCompleteScreen`," count + streak, calm no-score design) wired into
[`QuizScreen.tsx`](../mobile/src/presentation/screens/QuizScreen.tsx) — it's
just never used by Learn. This asymmetry is the root cause of "I can't find
the words I know after clicking Got it."

[`LearnCardScreen.tsx`](../mobile/src/presentation/screens/LearnCardScreen.tsx)'s
`empty` phase (lines 196–210, "All caught up") fires on `NoWordsAvailableError`
([`errors.ts`](../mobile/src/domain/quiz/errors.ts) — a single generic error,
no reason discriminant) whenever a *new* learn session is started with
nothing available — either the daily new-word budget is used up (temporary,
resets tomorrow) or the tier's content is genuinely exhausted (rare,
foundation pack is 2,848 words). The screen can't currently tell these apart,
and points nowhere.

**Out of scope here — real feature, not a UI fix:** the "Saved Words needs
multiple lists, including an auto-populated 'Learned' list" ask. `saved_words`
([migration 003](../mobile/src/infrastructure/db/migrations/003_word_feedback.ts))
has `word_id` as its **primary key** — a word can be saved exactly once,
period. Supporting multiple lists means a schema redesign (composite key or
join table), which touches `infrastructure/db/`, a CLAUDE.md High-Risk Path.
Scoped instead as its own plan: [`WORD_LISTS_PLAN.md`](WORD_LISTS_PLAN.md).

### ExitSessionSheet ("Leave study session?" sheet)
[`ExitSessionSheet.tsx`](../mobile/src/presentation/screens/ExitSessionSheet.tsx),
shown when the learner taps "Back" mid-`LearnCardScreen`:
- **Possible stale build — verify before touching styling.** Source codes
  "Leave" as `variant="secondary" fullWidth` (lines 88–94), which should
  render as a full-width outlined button matching "Keep going"'s width. The
  critique's screenshot shows small, unstyled, left-aligned text instead. No
  duplicate component defines this copy (`grep` confirms one file). This
  project has hit exactly this failure mode twice this week already (stale
  compiled binary not matching current source — see
  `memory/2026-07-04_e2e1-green-icon-dependabot.md` and
  `memory/2026-07-05_e2e1-rerun-binary-staleness.md`). **Rebuild + re-screenshot
  before Phase 21** — if "Leave" already renders full-width, that part of the
  original critique is moot.
- **The component's own doc comment overclaims what's built.** Line 13 says
  "swipe-to-dismiss = keep going," but there is no gesture wired anywhere —
  the `Modal`'s scrim is a plain `View` with no `onPress`, no
  `PanResponder`/gesture-handler code exists on this component. Tap-outside
  and swipe-down both currently do nothing. This is a real, confirmed gap
  (not a screenshot-vs-source question) — the two buttons are the only
  working exit mechanism today.
- **Scrim is `rgba(0,0,0,0.5)`** (line 106) — heavier than the "calm,
  no-guilt" voice the same file's doc comment describes (line 11–14).
- Current copy: headline "Your progress is saved." (line 71), subtitle "Pick
  up right where you left off, anytime." (line 75) — reads as pure
  reassurance, not a decision, even though the sheet exists specifically to
  gate a choice (stay vs. leave).

---

## Core design principle — smallest diff that fixes the real defect
Every phase here is presentation-only: prop values, spacing, a new small
wrapper component, one new state field for card index. No domain/SRS logic,
no schema, no new Button variant (Home reuses `secondary`; Learn Card reuses
existing tokens/variants throughout). The one phase with real structural
weight is the sticky footer (Phase 5) and word nav (Phase 6) — both still
confined to `mobile/src/presentation/screens/` and `Screen.tsx`.

## Out of scope
Rejected in chat, not re-litigated:
- **Home:** unifying "3/10" text vs. progress-bar visualization (measure
  different things); streak badge margin (no defect found against the
  screenshot); adding a weekly chart to fill dead space (feature invention,
  not a layout bug); turning "Start learning" into a full-width button
  (already `secondary`; doing this would recreate the CTA collision Phase 1
  fixes).
- **Learn Card:** shrinking/replacing `sense.explanation` with bullet points
  or a "hero" short-gloss card — directly reverses the Rich Word Detail
  decision (see Ground truth above); this is the single most important
  rejection in this plan, do not revisit without a fresh conversation with
  Ryan about undoing that decision explicitly.
- **Learn Card:** "Quick quiz" / "Mark as known" as an added interaction —
  violates the file's own hard invariant, "NO assessment widget, NO SRS
  write here" (line 24–25); assessment is LearnQuickCheck's job, one screen
  later, by design.
- **Learn Card:** "Practice This Word" / "I Know This" as the CTA label —
  both imply testing/claiming knowledge on a screen defined as pressure-free
  first exposure; also risks repeating the documented `estimateKnownCount`
  over-claim bug ([memory 2026-06-10](../memory/2026-06-10_build-feedback.md)).
- **Proficiency picker** — see Decisions needed #3.
- **Real audio playback** — Listen button already exists as UI scaffolding;
  wiring actual TTS/audio playback is a separate, larger infra task, not a
  UI-fix.
- **Progress: achievement badges, weak-words-to-review, "next milestone"
  beyond the simple mastered-count reframe, weekly rollup ("words learned
  this week")** — none of these exist as domain concepts today (see Ground
  truth: `UserStats` has 3 fields total). Building any of them is a real
  feature task with its own query/schema work, not a UI-fix. If wanted,
  scope as a separate plan.
- **Progress: static card reorder (Foundation Pack before Streak)** — the
  critique's own reasoning ("streak isn't useful at zero") only holds for
  new/inactive users; for an established streak, streak-first is the
  stronger motivator (why Duolingo leads with it too). Not worth a
  conditional-order feature for this pass — skip.
- **Progress: tab bar icon weight** — unverified claim from a single
  screenshot, same failure mode as the earlier (disproven) streak-badge-margin
  claim. Not acting on it without a direct pixel/stroke-width comparison of
  the actual rendered icons.
- **Settings: "title disappears" / sticky header** — not a bug, it's normal
  `ScrollView` behavior identical to every other screen using `Screen`. No
  collapsing-header infra is being built for a non-problem.
- **Settings: 90–110px bottom padding** — based on a wrong model of how the
  tab bar reserves space (see Ground truth); nothing is actually clipped.
  Small breathing-room bump only (Phase 18), not a clipping fix.
- **Settings: shrinking the Appearance pills below `minHeight: 44`** —
  reverses this app's own documented 44×44 touch-target accessibility floor.
  Restyle toward a tighter segmented look is fine; height isn't negotiable.
- **Settings: card padding reduction, section-header size reduction, "Sign
  in" row copy tweak, version-line "About section" wrapper beyond a simple
  visual pass** — all subjective taste calls from the critique, none are
  defects. Version-line spacing gets a cheap pass anyway (Phase 17) since
  it's nearly free; the rest aren't built without a separate ask.
- **Multi-list Saved Words (custom lists, list picker on save, auto-populated
  "Learned" list)** — real feature, real schema redesign, own plan:
  [`WORD_LISTS_PLAN.md`](WORD_LISTS_PLAN.md). Not folded in here because this
  plan's own core design principle (see above) is presentation-only, no schema.
- **Removing ExitSessionSheet entirely for a toast** — a real product
  question (raised, not dismissed), but the call is to keep the confirm-sheet:
  tapping "Back" mid-session is a deliberate, uncommon action, and the risk
  isn't data loss (nothing is ever lost) but an accidental exit blowing away
  flow state with zero friction. A toast fires after the fact and can't
  prevent that. Reframing the copy (Phase 22) fixes the actual complaint
  (currently reads as reassurance, not a decision) without removing the
  friction that's doing real work.
- **Adding a visible `X` close button** — once tap-outside-to-dismiss ships
  (Phase 24), a third dismiss affordance on top of two full-width buttons is
  redundant clutter, not clarity.
- **Darkening the scrim further to make "Got it" look more inert (critique
  #8/#9)** — directly contradicts the lighter-scrim ask (critique #6); a
  dimmed-but-visible background behind a bottom sheet is the standard
  iOS/Android pattern, and the scrim already blocks touches to what's behind
  it regardless of how dark it looks (it's an absolutely-positioned `View`
  covering the full screen). Not a real defect.
- **Sheet height/padding reduction (critique #5)** — low-confidence from one
  screenshot; the sheet has no fixed height and hugs its content already. No
  phase for this; revisit only if it still looks off after the copy change.

---

## Phases

Ordered cheapest/lowest-risk first; each independently committable.

### Phase 1 — Home: CTA hierarchy (Resume → secondary)
1. [`HomeScreen.tsx`](../mobile/src/presentation/screens/HomeScreen.tsx)
   line 117: change Resume's `<Button variant="primary">` → `variant="secondary"`.
2. Check [`HomeScreen.render.test.tsx`](../mobile/src/presentation/screens/HomeScreen.render.test.tsx)
   for any assertion tied to Resume's variant/testID; update if needed.
3. Sim check: exactly one solid-teal button on screen when Resume + Start
   review both render.

**Done means:** `npm run check` GREEN in `mobile/` + screenshot confirming
one solid CTA.

### Phase 2 — Home: status bar contrast (theme-aware, global)
1. In [`mobile/app/_layout.tsx`](../mobile/app/_layout.tsx), add a small
   `ThemedStatusBar` component that calls `useTheme()` and renders
   `<StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />`.
2. Replace the hardcoded line-68 `<StatusBar style="light" />` with it, same
   position (child of `ThemeProvider`, so it reacts to the Settings
   light/dark override too).
3. Flip sim appearance light/dark, confirm status bar text stays legible
   both ways.

**Done means:** `npm run check` GREEN + screenshots in both appearances.

### Phase 3 — Learn Card: header spacing + thinner progress bar
1. [`LearnCardScreen.tsx`](../mobile/src/presentation/screens/LearnCardScreen.tsx)
   header row (lines 266–303): increase `gap` (or split into
   `justifyContent: 'space-between'` groups) so `Back` / progress / counter+bookmark
   read as three distinct clusters instead of one crowded row.
2. Pass `height={4}` (or similar) to the `<ProgressBar>` on this screen only —
   `ProgressBar` already supports the prop, no component change needed.
   ("Slightly lower opacity" — skip; the bar already uses `borderSubtle` for
   the track and `colors.accent` for fill, both existing tokens; don't
   invent a new opacity value without a design-system reason.)
3. Sim check + [`LearnCardScreen.render.test.tsx`](../mobile/src/presentation/screens/LearnCardScreen.render.test.tsx)
   still green.

**Done means:** `npm run check` GREEN + screenshot showing clearer header grouping.

### Phase 4 — Learn Card: example card styling
1. Wrap the examples block ([lines 372–388](../mobile/src/presentation/screens/LearnCardScreen.tsx#L372-L388))
   in a `Card` (reuse [`Card.tsx`](../mobile/src/presentation/components/Card.tsx),
   same component Home already uses) instead of a bare `View`.
2. Bold the target word within each example sentence. Simplest correct
   approach: split each `ex.text` on a case-insensitive match of `word.word`
   (and its common inflected form already present in the sentence — do
   **not** attempt stemming/lemmatization here, just literal substring match
   against the base word; if no match, render the sentence unstyled — never
   throw) and render the matched span with `fontWeight: '700'`.
3. Keep quote style as-is (`"${ex.text}"`) — "use quotation marks less
   aggressively" was cosmetic preference, not a defect; skip unless it looks
   wrong once boxed in a card.

**Done means:** `npm run check` GREEN + screenshot showing boxed examples
with the target word visually bolded.

### Phase 5 — Learn Card: sticky bottom CTA
1. Add a `stickyFooter?: ReactNode` prop to
   [`Screen.tsx`](../mobile/src/presentation/screens/Screen.tsx): when
   present, render it as a fixed `View` below the `ScrollView`/content `View`
   (inside the same `SafeAreaView`, so bottom-safe-area is still honored),
   full-width, with the same `layout.screenGutter` horizontal padding and a
   top border/shadow for separation.
2. In `LearnCardScreen.tsx`, move the "Got it"/"Next" `<Button>` (lines
   414–425) into `stickyFooter` instead of rendering inline after the card body.
3. Check other `Screen` consumers are unaffected (prop is optional,
   default `undefined` → no behavior change when absent).

**Done means:** `npm run check` GREEN + screenshot showing the button
pinned at the bottom regardless of content length (test with both a short
single-sense word and a long multi-sense word).

### Phase 6 — Learn Card: button label
1. Change `label="Got it"` → `label="Next"` (or "Next word" — Ryan's call,
   [Decision #1](#decisions-needed-from-ryan)), same line as Phase 5's move.
2. Update the `accessibilityLabel="Got it"` prop and the two
   `accessibilityHint` strings (lines 420–424) to match the new label's
   framing ("Advance to card N" copy already fits either label — no change needed there).

**Done means:** `npm run check` GREEN, no stale "Got it" string left in the file.

### Phase 7 — Learn Card: forward/back word navigation
1. Add `handlePrevious` alongside `handleGotIt`: decrement `phase.index`
   (clamped at 0), same `cardKey.current += 1` remount pattern.
2. Add left/right chevron controls near the counter (per
   [Decision #2](#decisions-needed-from-ryan)) — reuse `Icon` (already
   imported) with `chevron-left`/`chevron-right` glyphs (confirm both exist
   in the Lucide icon set; add if missing, same recipe as prior icon
   additions in memory). Left chevron disabled/hidden at index 0.
3. Keep `Back` meaning "leave session" — do not repurpose it. The new
   chevrons are a distinct, clearly-different-looking control from the
   text/tertiary `Back` button.
4. Going back to a previously-"completed" card must not re-trigger the
   resume-snapshot write with a stale stage, and must not double-count
   anything — audit the `saveActiveSession` effect (lines 131–140) fires
   correctly when index decreases (it should — it just snapshots whatever
   `index`/`batch` currently are, no assumption of forward-only movement,
   but confirm with a test).
5. Add render tests: navigate forward then back, assert the same word
   re-renders, assert bookmark/sense state reloads correctly for the
   revisited word (existing `useEffect`s key off `currentWordId`, so this
   should fall out for free — verify, don't assume).

**Done means:** `npm run check` GREEN, new tests covering back-then-forward
navigation, no SRS/exit-sheet regression (existing `ExitSessionSheet` tests
still pass).

### Phase 8 — Progress: make Foundation Pack card tappable
1. [`ProgressScreen.tsx`](../mobile/src/presentation/screens/ProgressScreen.tsx)
   lines 139–151: wrap the tier card body in a `Pressable` (same recipe as
   the Saved Words card, lines 121–136) with a chevron-right `Icon` and
   `onPress` routing per [Decision #4](#decisions-needed-from-ryan).
2. Add `accessibilityRole="button"` + a11y label (e.g. `` `Study ${tier.displayName}` ``),
   matching the Saved Words card's a11y pattern.

**Done means:** `npm run check` GREEN + screenshot showing the card visually
matches Saved Words' tappable affordance (chevron present, consistent styling).

### Phase 9 — Progress: reframe the mastery line
1. Replace `` `${tier.mastered} of ${tier.total} mastered` `` (line 147) with
   a two-line treatment: primary `` `${tier.mastered} mastered` `` (or, for a
   true zero-state, `` `First goal: master 10 words` `` — only when
   `tier.mastered === 0`), plus a smaller/tertiary-color subtext
   `` `${tier.displayName} · ${tier.total.toLocaleString()} words total` ``.
2. Keep this scoped to display text only — no change to `masteryCompletion`/
   `countMastered` (domain/srs, untouched).

**Done means:** `npm run check` GREEN + screenshot showing the reframed
zero-state copy for a fresh install.

### Phase 10 — Progress: visible "0% complete" label
1. Add a `Text` (caption/tertiary) above or below the tier `<ProgressBar>`
   (line 145) rendering `` `${Math.round(tier.completion * 100)}% complete` ``.
   `ProgressBar`'s existing `label` prop stays as-is (a11y only) — this is a
   new sibling element, not a prop change.

**Done means:** `npm run check` GREEN + screenshot showing a visible
percentage label at 0%, not just a flat gray bar.

### Phase 11 — Progress: empty state for a new/inactive user
1. Add a branch (per [Decision #5](#decisions-needed-from-ryan): gated on
   `stats !== null && stats.totalSessions === 0`) that replaces the Streak
   card with an encouragement card: `` `No study sessions yet. Complete your
   first word set to start building progress.` `` + a `Button` labeled
   `"Start studying"` routing the same way as [Phase 8](#phase-8--progress-make-foundation-pack-card-tappable).
2. Foundation Pack + Saved Words cards render as normal beneath it (Saved
   Words already self-gates on `savedCount > 0`, line 119 — no change needed there).
3. A read failure (`stats === null`) must **not** trigger this branch — stays
   silently fail-soft per [Decision #5](#decisions-needed-from-ryan).

**Done means:** `npm run check` GREEN + new render test asserting the
empty-state card + CTA appear when `totalSessions === 0`, and the existing
zero-but-`stats-is-null` fail-soft path is unaffected.

### Phase 12 — Progress: "Today" widget (reuse existing query)
1. Fetch `queries.getDailyProgress(tierId)` in `ProgressScreen.tsx`'s `load()`
   (same call `HomeScreen.tsx` already makes, lines 69–83) — no new query,
   no domain change.
2. Render a small "Today" card/line: `` `${reviewsCompletedToday}/${effectiveDailyCap}
   reviews · ${newWordsCompletedToday}/${newWordsBudget} new words` ``, placed
   per [Phase 13](#phase-13--progress-card-order)'s ordering.

**Done means:** `npm run check` GREEN + screenshot showing today's numbers
sourced from the same data Home already displays (no drift between the two screens).

### Phase 13 — Progress: card order
1. Re-order to: title → empty-state card (if Phase 11 triggers) or Today
   widget (Phase 12) → Foundation Pack (now tappable, Phase 8/9/10) → Saved
   Words → Streak. This is a pure JSX reorder of existing/new blocks — no new state.

**Done means:** `npm run check` GREEN + screenshot confirming order.

### Phase 14 — Settings: fix Privacy toggle contrast
1. [`SettingsScreen.tsx`](../mobile/src/presentation/screens/SettingsScreen.tsx)
   lines 383–392: change the `Switch`'s off-state colors per
   [Decision #6](#decisions-needed-from-ryan) (`thumbColor`/`trackColor.false`).
   On-state (`colors.accent` / `colors.accentSubtle`) stays unchanged.

**Done means:** `npm run check` GREEN + screenshot showing a clearly visible
off-state thumb/track distinction.

### Phase 15 — Settings: fix the analytics double-negative
1. Lines 378–394: relabel to the copy from
   [Decision #7](#decisions-needed-from-ryan) ("Share usage analytics").
2. Invert the **displayed** switch only:
   `value={!analyticsOptOut}`, `onValueChange={(v) => handleAnalyticsToggle(!v)}`.
   Do not rename or invert the underlying `analyticsOptOut` field, the
   `AnalyticsOptOutStore` API, or anything read by
   `infrastructure/analytics/` — this is a CLAUDE.md High-Risk Path; the fix
   is presentation-only, confined to this file. If touching
   `infrastructure/analytics/` at all turns out to be unavoidable, stop and
   flag it — that would need Ryan's confirmation per the High-Risk Paths table.
3. Update the subtitle/`accessibilityLabel`/`accessibilityHint` (lines
   380, 389–390) to match the new positive framing (e.g. "Help improve the
   app with anonymous usage data" / accessibilityLabel "Share usage analytics").

**Done means:** `npm run check` GREEN + manual toggle check confirming ON
now visually/semantically means "sharing," with the stored flag's actual
meaning (and every other reader of it) untouched.

### Phase 16 — Settings: move Delete Account out of Legal
1. Move the `SettingsRow` for "Delete Account" (lines 417–423) from the
   `Legal` `Card` (lines 398–424) into the `Account` `Card` (lines 266–327),
   as its last row (after "Restore purchases"). Same handler
   (`setShowDeleteModal(true)`), same `labelColor="destructive"`, same
   `showChevron={false}` — pure relocation, no behavior change.
2. `Legal` card now contains exactly: Privacy Policy, Terms of Service,
   Export my data.

**Done means:** `npm run check` GREEN + screenshot confirming Delete Account
renders under Account, Legal renders with 3 rows only.

### Phase 17 — Settings: version footer polish (optional, cheap)
1. Lines 427–436: tighten `gap`/gap between the two footer lines and add a
   touch more `paddingTop` to visually separate it from the Legal card above
   — small styling pass only, no restructure into a new "About" card/section.

**Done means:** `npm run check` GREEN + screenshot showing the footer read
as clearly separate from the Legal card rather than loose trailing text.

### Phase 18 — Settings: modest bottom padding bump (optional)
1. `Screen.tsx`'s `inner.paddingVertical` (currently `spacing.s4`) or the
   footer View's `paddingBottom` (currently `spacing.s2`, line 427) — bump
   the footer's bottom padding by one token step (`s2` → `s3`) for a touch
   more breathing room above the tab bar. This is a **global** change to
   `Screen.tsx` if done there — confine it to `SettingsScreen.tsx`'s own
   footer `View` instead, to avoid nudging every other screen using `Screen`.

**Done means:** `npm run check` GREEN + screenshot showing a slightly larger
gap between the footer text and the tab bar, without affecting other tabs.

### Phase 19 — Learn: session-complete recap (fixes "I can't find the words I know")
1. Build a new, small `LearnSessionCompleteScreen` (per
   [Decisions #8–9](#decisions-needed-from-ryan)): calm design matching
   `SessionCompleteScreen`'s tone (check icon, no accuracy/score), headline
   "New words learned," and the actual list of `batch` words (word + short
   gloss/definition — reuse the flat `word.definition` field, no rich-sense
   fetch needed here), `Done` button → Home.
2. Wire it into [`learn-check.tsx`](../mobile/app/learn-check.tsx): instead
   of `onComplete={() => router.replace('/')}` firing the navigation
   directly, render the new recap screen with the completed `batch`, and
   its `Done` button does the `router.replace('/')`.
3. Resume path unaffected: this only fires on natural completion of
   `LearnQuickCheckScreen`, not on exit/resume snapshots.

**Done means:** `npm run check` GREEN + new render test + screenshot showing
the learned words listed after finishing a learn session, before landing on Home.

### Phase 20 — Learn: clarify "All caught up" (daily budget vs. exhausted content)
1. In [`LearnCardScreen.tsx`](../mobile/src/presentation/screens/LearnCardScreen.tsx),
   on entering the `empty` phase, additionally call the existing
   `queries.getDailyProgress(tierId)` (same call Home/Progress already use —
   no new query) to check `newWordsCompletedToday >= newWordsBudget`.
2. Show one of two copies: **daily budget reached** → "You've hit today's
   new-word limit — come back tomorrow for more" (temporary, reassuring);
   **content exhausted** → keep the existing "You're all caught up on new
   words" (rare — foundation pack is 2,848 words).
3. Add a secondary link/button under "Back to Home": "See your progress" →
   `router.push('/(tabs)/progress')` (interim destination; once
   [`WORD_LISTS_PLAN.md`](WORD_LISTS_PLAN.md) ships a "Learned" list, this
   should retarget there instead — noted in that plan too).

**Done means:** `npm run check` GREEN + screenshots showing both copy
variants (mock/force each condition in a render test), with a working link
out instead of a dead end.

### Phase 21 — ExitSessionSheet: verify current build (do this before 22–24)
1. Rebuild the app fresh (per the stale-binary playbook in
   `memory/2026-07-05_e2e1-rerun-binary-staleness.md`) and re-screenshot the
   sheet. Confirm whether "Leave" already renders as a full-width outlined
   button matching "Keep going."
2. If it already does: critique #4 is resolved, no code change needed for
   button width/prominence — proceed straight to Phases 22–24 (copy, scrim,
   tap-outside). If it genuinely renders as small left-aligned text on a
   fresh build, that's a real Button/layout bug distinct from anything this
   plan has assumed — stop and re-scope before continuing.

**Done means:** a fresh-build screenshot exists and the discrepancy is resolved one way or the other.

### Phase 22 — ExitSessionSheet: reframe copy as a decision
1. [`ExitSessionSheet.tsx`](../mobile/src/presentation/screens/ExitSessionSheet.tsx)
   line 71: `"Your progress is saved."` → `"Leave study session?"`.
2. Line 75: `"Pick up right where you left off, anytime."` →
   `"Your progress is saved — you can continue from this word later."`
3. Line 80: `label="Keep going"` → `label="Keep studying"`.
4. Line 89: `label="Leave"` → `label="Leave session"`.
5. Update the `accessibilityLabel` (line 57, "Leave this session?" — already
   close, leave as-is or align exactly) and both `accessibilityHint`s (lines
   84, 93) if the new labels make them redundant/stale.

**Done means:** `npm run check` GREEN + screenshot showing the new copy.

### Phase 23 — ExitSessionSheet: lighten the scrim
1. Line 106: `rgba(0,0,0,0.5)` → per
   [Decision #10](#decisions-needed-from-ryan) (`rgba(0,0,0,0.35)` default).

**Done means:** `npm run check` GREEN + screenshot showing a lighter, still-clearly-present scrim.

### Phase 24 — ExitSessionSheet: tap-outside-to-dismiss
1. Wrap the `scrim` `View` (lines 39–43) in a `Pressable` with
   `onPress={onKeepGoing}` (the safe default, matching the doc comment's
   stated intent) — keep `accessible={false}`/`importantForAccessibility="no"`
   as-is so screen readers still land on the sheet content, not the scrim.
2. Update the stale doc comment (line 13, "swipe-to-dismiss = keep going")
   to describe what's actually built: "tap outside = keep going" — don't
   leave aspirational documentation that doesn't match the code, same class
   of gotcha as the "All caught up" section above.

**Done means:** `npm run check` GREEN + manual check that tapping the dimmed
area outside the sheet dismisses it back to the learn card (not to Home).

---

## Risks / gotchas
- Neither screen is a CLAUDE.md High-Risk Path
  (`infrastructure/db|srs|iap|storage|crash|analytics`, `app.json`) — all
  seven phases are presentation-only (`mobile/src/presentation/`,
  `mobile/app/_layout.tsx`). No confirmation gate expected at execution time.
- `_layout.tsx` (Phase 2) is a shared, frequently-touched file — keep the
  diff to the StatusBar line only.
- Phase 5's `Screen.tsx` change touches a component used by every screen in
  the app — the new prop must be additive/optional with zero effect when
  omitted. Run the full `mobile` suite, not just Learn Card's, after this phase.
- Phase 7 is the only phase touching state-machine logic (`LearnPhase`,
  index management) — still presentation-layer, but the highest-risk phase
  here for regressions (resume snapshot, bookmark hydration, sense caching
  all key off `currentWordId`/`index`). Land it last, after the cheaper
  phases are verified, and don't combine it with Phase 5/6 in one commit.
- Per AGENTS.md: local-green ≠ CI-green — confirm CI after each push, not
  just local `npm run check`.
- Phase 11's empty state must key off `totalSessions`, not `totalWordsMastered`
  or tier completion — a user who's studied but mastered nothing yet (very
  common early on) must not see "no sessions yet," that would be actively wrong.
- `ProgressScreen` refreshes via `useFocusEffect` (lines 75–79), not just on
  mount — Phase 12's new `getDailyProgress` call belongs inside the existing
  `load()` callback so it participates in that same refresh-on-focus behavior,
  not a separate effect.
- **Phase 15 touches analytics wording/display logic adjacent to a CLAUDE.md
  High-Risk Path** (`infrastructure/analytics/`) even though the fix itself
  stays in `SettingsScreen.tsx` — re-read the High-Risk Paths table before
  starting this phase specifically, and stop for confirmation if the diff
  turns out to need anything in `infrastructure/analytics/` itself.
- **Phase 18:** do the padding bump in `SettingsScreen.tsx`'s local footer
  `View`, not `Screen.tsx` — `Screen` is shared by every tab; a change there
  silently affects Home/Progress/Learn Card too.
- **Phase 19** is the largest single addition in this plan (a new screen +
  a routing change in `learn-check.tsx`) — still presentation/routing-only
  (no `domain/srs` or `infrastructure/db` diff: it just displays the batch
  already in memory), but land it carefully and re-check the resume path
  (`?resume=1`) isn't accidentally routed through the new screen on an
  exit-and-return, only on natural completion.
- **Phase 20**'s two-copy branch must not misfire: a user who's mid-way
  through today's budget but the tier's content actually IS exhausted should
  see "exhausted," not "come back tomorrow" (check content-exhaustion first,
  budget second, or check both and prefer whichever is actually true — don't
  assume budget-reached is always the more common case).
- **Phase 21 must run before 22–24** — no point rewriting copy/scrim/gesture
  on a component you haven't confirmed is even rendering what its own source
  says on a current build.
- **Phase 24's `Pressable` wrapper around the scrim must not swallow the
  handle/sheet's own touch area** — the scrim and the sheet are separate
  sibling `View`s already (lines 39–43 vs. 45–58), so this should be additive,
  but verify the sheet's buttons still receive touches after wrapping the scrim.

## Docs to update on completion
- **None required for Phases 1–6, 8–10, 12–14, 16–18** — mechanical UI
  fixes/reuse of existing queries, no new pattern or rule for a future agent
  to know about.
- **Phase 7:** if the chevron nav introduces a reusable pattern (e.g. a
  generic "paged card" navigation component), note it once in
  `memory/MEMORY.md`; if it stays local to `LearnCardScreen.tsx`, skip.
- **Phase 11:** none — reuses the existing empty-state pattern already
  documented implicitly by Home/LearnCard's own empty branches; no new rule introduced.
- **Phase 15:** none required if the diff stays presentation-only as
  planned; if it turns out to touch `infrastructure/analytics/`, that
  crosses a High-Risk Path and would need a note there plus Ryan's
  confirmation before landing.
- **Phase 19:** if this is the first "Learn flow has its own completion
  moment" screen, add one line to `memory/MEMORY.md` — future agents
  touching the learn loop should know this exists (same class of gotcha as
  the original learn-loop-disconnect bug from 2026-06-09).
- **Phase 20:** none — reuses the existing `getDailyProgress` query, no new pattern.
- **Phases 21–24:** none beyond fixing the stale doc comment in
  `ExitSessionSheet.tsx` itself (Phase 24, step 2) — no new pattern for a
  future agent to learn elsewhere.
