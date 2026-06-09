# LexiTap — Design Finalization Plan

**Status:** accepted · **Created:** 2026-06-09 · **Owner:** Ryan + design agent
**Goal:** Lock a *code-ready* design so coding never loops back to "the design isn't good."
**Intent (Ryan, 2026-06-09):** complete + comprehensive design in Figma **before any RN code** — full-design path, not targeted polish. (Burned before by coding-before-design.) Figma is the source of truth for visuals; existing RN screens are re-done against the locked design.
**Figma file:** `Jx0TLmVpgmsjtMA3uB6uS4` · **14 pages** (10 functional screen pages + 4 foundation: 📱 Wireframes / 🎨 Tokens / ✏️ Typography / 🧩 Components). *(Empty ✨ Hi-Fi + 🎨 Design System pages deleted 2026-06-09; foundation is built into the 3 existing foundation pages, not a new one.)*

---

## 0. Why this plan is shaped the way it is (read first)

Per-page polish is the **last 20%**. The thing that actually stops the design↔code loop is a shared
**token + component foundation**. Audit of the live file (2026-06-09) proved the foundation is
*documented but not consumed*:

| Check | Reality in the file today |
|---|---|
| Figma **variables** (tokens w/ light/dark modes) | **0** — none. Only 10 legacy paint styles + 7 text styles. |
| Styles **bound** on the *polished* Home & Paywall | **0 / ~60 fills, 0 / ~30 text nodes** — every value is a raw literal. |
| Distinct **hardcoded** colors on Home alone | **14** (near-duplicate navies/greys) — drift already baked in. |
| **Icons** in screens | mostly **emoji** (8 on Home, 5 on Paywall); the 16 custom icon frames are unused. |
| Real **components** (instances) | **0** — every screen is a bespoke node tree. |
| Type scale | drifted — specimens (Display/H1/Body/Word…) ≠ styles (Heading 1/2, Body Regular **(alt)**…). |
| Effect styles | 3, all **unnamed**. |
| Design System page | **empty**; two duplicate "Legacy Components" sections on Components page. |

**Consequence if we skip the foundation:** coding the screens as-is hardcodes 14 navies + emoji into
React Native; one button change = editing 60 screens = the exact loop to avoid.

**Therefore:** Phase 0 (foundation, cross-cutting) ships **before** the 10 per-page sections. The 10
sections then = *apply foundation → dedupe → rebuild from components → add missing states → polish → QA.*

**Skills to use:** `figma-use` (always), `figma-generate-library` (Phase 0 tokens + components),
`figma-code-connect` (the literal anti-loop bridge — maps Figma components → RN components),
`figma-generate-design` (only when adding net-new screens).

### Canonical sources (Figma is downstream of these — port, don't invent)
The design system is **already specified in two places**. Figma's job is to become their faithful, bindable mirror — not a third opinion.

| Source | Authority | Use for |
|---|---|---|
| `mobile/src/presentation/theme/tokens.ts` | **Shipping truth** (what the app actually renders) | Exact hex / sizes / durations to put in Figma variables. Code Connect targets this. |
| `lexitap-docs/03-ux-design/DESIGN_SYSTEM.md` | **Design intent** (rationale, component specs, states) | Component anatomy, states, motion/haptics, iconography, principles. |
| `website/public/styles.css` | Web mirror (partial, slightly behind) | Web parity only — **not** the source. Its spacing names differ (`--s6:24` vs token `s6:32`); follow `tokens.ts`. |

**✅ Code↔doc divergences — ALL RESOLVED 2026-06-09 (`DESIGN_SYSTEM.md` corrected to match `tokens.ts`):**
1. **Type face — Playfair ratified** (Ryan, 2026-06-09): Playfair Display Bold for `h1`/`display`, Inter for all else. Doc updated. Type styles are now safe to bind.
2. **`headline`** = `18/22, 700` (code wins). 3. **`body`** = `15/24` (code). 4. **light `text.tertiary`** = `#6B7378` (code).

Rule held: where code and doc disagreed, **`tokens.ts` won** and the doc was corrected in the same pass — never silently.

### Resolved decisions (were deferred — now decided, so we don't rebuild components)
1. **Proficiency screen — CUT** (D1, already decided in memory 2026-05-31; off-spec: CEFR-band vs frequency-rank). §1 flow below has it removed. Do **not** build a proficiency component.
2. **Known/learned metric — ONE noun, explicit denominator.** Use **"known"** everywhere; always show the list it's measured against. Home = `1,240 / 3,000 known · Core 3,000`; Knowledge Map = `~2,400 known · across all lists` (bigger because it spans full CEFR, not just Core 3,000). The two numbers differ by *denominator*, not by *concept* — never two different verbs.
3. **Learn-loop widgets — design BOTH MultipleChoice + DragDrop (both are MVP per `DESIGN_SYSTEM.md` §Quiz widgets).** Correction: an earlier draft cut drag-drop — that overstepped the authoritative design doc, which lists both as MVP. Passive recognition (no `TextInput`) is the hard rule; tap-MultipleChoice and drag-match both satisfy it. **MultipleChoice is launch-critical** (live RN quiz uses it); **DragDrop is MVP-designed, can ship just after.** ImageMatch + Classification are Phase 4 — design later, not now. §4 builds `AnswerOption` (MultipleChoice) + `DragChip`/`DropZone` (DragDrop).

---

## Phase 0 — Foundation (cross-cutting · hard dependency for all 10 sections)

### 0.0 Build the audit gate FIRST (blocks every other exit check)
- The QA gate, the "code-ready" bar, and every per-section ⑤ depend on an objective binding audit. **It now exists:** [`.design-specs/figma-binding-audit.js`](../.design-specs/figma-binding-audit.js).
- It's a `use_figma` script (runs in the Figma plugin context, not node). Paste its body into `use_figma` (`skillNames:'figma-use'`); set `TARGET_PAGE` or run against the current page.
- Returns per-screen + page totals: `rawFills`, `textBound/textTotal`, `emojiTextNodes`, `instances`, and a `gate: PASS|FAIL`. **A page is code-ready only when `gate === 'PASS'`** (every screen: `rawFills:0`, `textBound===textTotal`, `emojiTextNodes:0`).
- **Baseline captured (2026-06-09)** against page `03 · Home` (3 screens): `gate: FAIL · rawFills 76 · textBound 0/51 · emojiTextNodes 15 · instances 0`. This is the red baseline; every later gate compares against it. (Proves the script runs — it is not vaporware.)

### 0.1 Tokens → Variables (the keystone — a 1:1 PORT of `tokens.ts`, not an invention)
- Collections + modes: **`color`** (modes: `Dark` *(default/canonical)*, `Light`), `space`, `radius`, `type`, `motion`.
- **Delete the stale legacy paint styles** `Color/Brand/{Coral,Gold,Navy,Turquoise}` — they contradict the code. The real brand is a **single teal accent**; there is no coral/gold/navy/turquoise.
- **One tier is enough here:** the code tokens are already semantic. Create these `color/*` variables with **both modes** (Dark first):

  | variable | Dark | Light | scope |
  |---|---|---|---|
  | `bg/base` | `#0E1112` | `#FBFCFC` | FRAME_FILL |
  | `bg/surface` | `#171A1C` | `#FFFFFF` | FRAME_FILL |
  | `bg/surface-raised` | `#1F2426` | `#F7F9F9` | FRAME_FILL |
  | `bg/surface-sunken` | `#0A0C0D` | `#F1F3F4` | FRAME_FILL |
  | `border/subtle` | `#262B2E` | `#E6E9EA` | STROKE |
  | `border/strong` | `#3A4145` | `#C4CBCE` | STROKE |
  | `text/primary` | `#F2F5F6` | `#1A1D1E` | TEXT_FILL |
  | `text/secondary` | `#A9B2B6` | `#52595C` | TEXT_FILL |
  | `text/tertiary` | `#6E777B` | `#6B7378` | TEXT_FILL |
  | `accent` | `#20B2AA` | `#178F88` | FRAME_FILL, TEXT_FILL, STROKE |
  | `accent/pressed` | `#1A938C` | `#0F6E68` | FRAME_FILL |
  | `accent/subtle` | `#13322F` | `#DCF0EE` | FRAME_FILL |
  | `on-accent` | `#062826` | `#FFFFFF` | TEXT_FILL |
  | `success` | `#4CAF50` | `#2E7D32` | FRAME_FILL, TEXT_FILL |
  | `success/subtle` | `#16301A` | `#E3F1E4` | FRAME_FILL |
  | `caution` | `#FFC107` | `#8B5A00` | FRAME_FILL, TEXT_FILL |
  | `caution/subtle` | `#33290A` | `#F8EFD6` | FRAME_FILL |
  | `streak` | `#FF9A3D` | `#E07B2E` | FRAME_FILL, TEXT_FILL |
  | `destructive` | `#E5484D` | `#CC3A3F` | TEXT_FILL — **confirmations only, never quiz feedback** |

- **`space`** (8pt grid, exact token names): `s1=4 s2=8 s3=12 s4=16 s5=24 s6=32 s7=48 s8=64` (scope GAP + padding). `radius`: `sm=8 md=12 lg=20 full=999` (CORNER_RADIUS).
- Scopes set explicitly per the table — never ALL_SCOPES. Screens bind to these names; Code Connect maps them straight onto `tokens.ts` keys (1:1, no translation layer).

### 0.2 Type system — PORT `tokens.ts` names (divergences resolved — safe to bind)
- 10 styles, exact code names + values (do **not** rename to Display/H1/Body Strong — Code Connect needs 1:1):

  | style | size/line | weight | family |
  |---|---|---|---|
  | `h1` | 44/48 | 700 | Playfair Display |
  | `display` | 34/38 | 700 | Playfair Display |
  | `title` | 28/34 | 700 | Inter |
  | `headline` | 18/22 | 700 | Inter |
  | `bodyLg` | 18/26 | 400 | Inter |
  | `body` | 15/24 | 400 | Inter |
  | `label` | 14/20 | 600 | Inter |
  | `caption` | 13/18 | 400 | Inter |
  | `smallCaps` | 11/16 | 700 | Inter · uppercase · +1.65 tracking |
  | `mono` | 14/20 | 500 | Inter · **tabular figures** (counters never jiggle) |

- **Delete** the legacy `Body Regular (alt)` + `Heading 1/2/3` styles. Each new style binds its color to a `text/*` variable. Rebuild the `✏️ Typography` page specimens to equal the bound styles.

### 0.3 Elevation / surfaces (dark = lightness steps, NOT shadow — per `DESIGN_SYSTEM.md`)
- Dark mode separates layers by **surface lightness + 1px `border/subtle`**, not drop shadows. The `bg/surface-*` ramp already encodes elevation — use it.
- Only the **modal/sheet** shadow exists: name the one effect style `elevation/modal` = `0 8 24 rgba(0,0,0,0.40)`. Add `focus-ring` (2px `border/strong`). Delete the other 2 unnamed effect styles. Light mode leans on this shadow for hierarchy.

### 0.4 Icons — adopt **Lucide** (RESOLVED in `DESIGN_SYSTEM.md`; my earlier "rebuild icon_* frames" was wrong)
- **UI icon system = Lucide** (`lucide-react-native`, Apache 2.0). Line, **1.75px stroke**, rounded caps, **24×24** grid, geometric/neutral. **Ban emoji in UI** (15 on Home today → swap).
- The 13 `icon_*` frames on the Components page are **feature-illustration glyphs, not the UI set** — leave them as marketing illustration (or archive); do **not** turn them into UI icons. Keep `lexitap_wordmark` + `lexitap_app_icon` (brand). The logo tap-mark is **brand-only, never a UI icon**.
- Import the needed Lucide subset as components, stroke bound to `text/*`/`accent` (follows mode), size via `space`-adjacent size tokens (16/20/24). **Inventory needed:** tab bar (`home`, `layers`/quiz, `bar-chart`/progress, `settings`), `flame` (streak), `snowflake` (streak frozen), `check`, gentle-dash/`minus` (correction — never a red ✗), `chevron-right/left/down`, `lock`, `volume-2` (audio), `search`, `x` (close), `arrow-left` (back), `circle-check`. Each pairs with a text/a11y label — icon alone never carries meaning.

### 0.5 Component library (`figma-generate-library`) — anatomy from `DESIGN_SYSTEM.md`
Token-bound, dark-canonical/light-via-mode, auto-layout, min 48×48 touch target. Build:
- **Button** — `primary` (fill `accent`, label `on-accent`, `radius/md`, h≥48, pressed `accent/pressed` + scale .98) / `secondary` (transparent, 1px `border/strong`, `text/primary`) / `tertiary` (text-only `accent`) / `destructive` (text-only `destructive`, confirm-sheet only). The only place red appears.
- **Card** — `bg/surface`, `radius/md`, `border/subtle`, `s4` padding, **no shadow in dark**. **WordCard** variant: word in `headline`, definition in `text/secondary`, trailing mastery ring.
- **Quiz widgets** (shared frame: prompt / interaction / feedback; **no TextInput**): **MultipleChoice** `AnswerOption` (option card, h≥56, `radius/md`; states idle / selected=`accent` border / correct=`success.subtle`+check / incorrect=`caution.subtle`+dash, never red ✗ — and the correct option simultaneously highlights). **DragDrop** `DragChip` (`radius/full`, `bg/surface-raised`, lift scale 1.04 on pickup) + `DropZone` (`bg/surface-sunken`, dashed `border/subtle`, valid-target `accent` border).
- **Streak** pill (`radius/full`, `flame` + integer in `mono`): `active` / `at-risk` (outline + `caution` ring) / `frozen` (`snowflake` + "Frozen" label + `text/secondary` — three redundant channels). Never shows time/word targets.
- **Progress** — MasteryRing (`accent` arc on `border/subtle` track, 2.5px) · KnowledgeMapBar (segmented `success`/`accent`/`text-tertiary` = Known/Learning/New) · DailyCapMeter (linear, calm "done for today", not a lockout).
- **Chip** (`radius/full`, `label`; selected `accent.subtle` fill + `accent` text) · **TabBar** (4 tabs Home/Quiz/Progress/Settings — locked MVP set; active `accent`, inactive `text/tertiary`) · **Sheet** (`radius/lg` top, `bg/surface-raised`, grabber) · **Field** (default/focus/error — non-quiz only) · **ListRow** (leading icon + trailing chevron/toggle/value) · **TopBar** · **Banner/Toast** (success/caution/offline) · **EmptyState**.
- Each: documented variant props, named layers, `description` filled (feeds Code Connect).

### 0.6 Layout system
- Canonical artboard 393×852 (iPhone 15). Safe-area top/bottom. Screen gutter = `s4` (16). Content max-width 600 (`layout.contentMaxWidth`). **Min touch target 48** (`layout.minTouchTarget`, WCAG 2.2 AA) — every interactive node ≥48×48 even when visually smaller.
- **Auto-layout everywhere** (no absolute x/y for in-screen content) so reflow / dark-mode / text-length / RTL never breaks layout. (RTL is a live concern — issue #10.)

### 0.7 Motion & haptics (port from `DESIGN_SYSTEM.md` + `tokens.ts`)
- `motion` variables: `fast=120 base=220 slow=360` (ms). Easing `cubic-bezier(0.2,0,0,1)`. `slow` is the one allowed "moment" (Knowledge Map reveal) — everything else is `fast`/`base`.
- Spring presets (annotate on interactive components, for the RN `useMotion` hook): `snap {400/25/0.8}` (taps), `settle {200/18/1.0}` (drag release), `sheet {280/28/1.0}` (modals).
- **Reduce-Motion:** every motion note must specify its collapse → cross-fade/instant. Figma can't enforce it; annotate so RN honors it.
- **Haptics (annotate, not visual):** select/pickup=`selection` · correct=`notificationSuccess` · gentle correction=`impactLight` (never an error buzz) · streak++=`impactMedium` · session complete=`notificationSuccess`. **No error haptic on wrong answers** (non-punitive invariant).

### 0.8 Code Connect prep (`figma-code-connect`) — the anti-loop bridge
- Because variables/styles/components are named **1:1 with `tokens.ts` + RN components**, Code Connect is a thin mapping, not a translation. Stub the RN inventory and map `figma.connect()` so design edits surface as code diffs, not silent drift:

  | Figma component | RN counterpart (target path) |
  |---|---|
  | `Button` | `mobile/src/presentation/components/Button.tsx` |
  | `Card` / `WordCard` | `…/components/Card.tsx`, `…/WordCard.tsx` |
  | `AnswerOption` | `…/quiz/` (MultipleChoice option — no `TextInput`) |
  | `DragChip`/`DropZone` | `…/quiz/` (DragDrop) |
  | `Streak` | `…/components/StreakPill.tsx` |
  | `MasteryRing`/`KnowledgeMapBar` | `…/components/progress/` |
  | `TabBar` | `mobile/app/(tabs)/_layout.tsx` |
  | `Sheet`/`ListRow`/`Chip`/`Banner` | `…/components/` |
  | all `color/*` `type/*` `space/*` `radius/*` | `mobile/src/presentation/theme/tokens.ts` |

  *(Confirm exact RN paths against the repo when stubbing — table is the intended mapping, not verified file paths.)*

**Phase 0 exit gate:** a polished sample screen (Home) rebuilt entirely from library components, every
color/text/space/icon bound to a variable/style/component, Light+Dark both correct from a single mode switch.
If Home can't be flipped Light↔Dark by toggling one mode, Phase 0 isn't done.

---

## The 10 Sections (one per page)

**Every section follows the same 5 steps:** ① Dedupe stale variants (keep *Polished*, delete *Hi-Fi*/*Redesign*
copies once their content is preserved) → ② Rebuild screen from Phase-0 components/tokens → ③ Add missing
states/screens → ④ Polish (spacing, hierarchy, motion notes, copy) → ⑤ QA gate (see Cross-cutting).

### Section 1 — `01 · Onboarding` (14 frames)
- **Dedupe:** 3 Knowledge Maps (Hi-Fi/Redesign/Polished → keep Polished), 2 Diagnostics (keep Band-Walk Polished). Move annotations to a sub-section, not loose frames.
- **Verify flow** (proficiency screen CUT — decision 1): Welcome → Age Gate → Goal → List Selection → Diagnostic → Confirm → Knowledge Map → CEFR Map → Onboarding Complete → (hand-off to Paywall).
- **Add/confirm states:** diagnostic mid-progress, "no/skip" paths, notification-permission opt-in (if used), first-run empty.
- Tie copy to **Top 3,000 free list** framing (already done on Diagnostic + KMap — propagate to Goal/List Selection).

### Section 2 — `02 · Auth` (3 frames)
- Current: Sign In, Sign In Error, Sign In Success. **Gaps:** magic-link "check your inbox", 6-digit **OTP entry** screen, signed-in vs signed-out Settings state, deep-link landing/loading. (Matches the live AU1 two-phase email→OTP flow.)
- Componentize Field (default/focus/error), Button states.

### Section 3 — `03 · Home` (3 frames) — **the Phase-0 exit-gate page; do this first**
- **Keep/kill (from audit):** rebuild `09 · Home (Polished)` (46 rawFills, 8 emoji) and `LN-1 · Home — All Caught Up (Hi-Fi)` (27 rawFills, 7 emoji) from components; move `09 · Annotation` into a side annotations strip. Baseline = `rawFills 76 / emoji 15 / instances 0` → target `gate: PASS`.
- **Gaps:** first-run (0 reviews due), reviews-due badge, streak-at-risk state.
- **Apply the known/learned decision (decision 2):** Home = `1,240 / 3,000 known · Core 3,000`; KMap = `~2,400 known · across all lists`. One verb ("known"), denominator always shown. Update both screens' copy to match.

### Section 4 — `04 · Learn Loop` (10 frames)
- **Dedupe:** Learn Card / Quiz / Feedback each have Hi-Fi + Redesign copies → collapse to one canonical each.
- Build from `WordCard`, `AnswerOption` (MultipleChoice), `DragChip`+`DropZone` (DragDrop — both MVP per decision 3), `ProgressBar`, `Sheet` (Forgiveness). **Passive recognition only — no TextInput** (hard rule; enforced by `guardrails.mjs`).
- **Add states:** correct / incorrect (`caution`, never red ✗) / last-card-of-session. Feedback = success/caution token + icon + motion (three redundant channels, never color-only). ImageMatch + Classification = Phase 4 (design later).

### Section 5 — `05 · Session` (3 frames)
- Session Complete, Results, Words to Focus. Build from `ProgressRing`, `ListRow`, `Badge`. Add: zero-correct / perfect-session edge states.

### Section 6 — `06 · Curriculum` (3 frames)
- Overview, Lesson Word List, Search & Browse. Add: locked-pack/level state, list-switching (Top 3,000 / 9,000 / full CEFR) selector, empty search.

### Section 7 — `07 · Words & Review` (4 frames)
- Word Detail, Review Queue, Review History, SRS Schedule. Build from `WordCard`, `ListRow`. Add: word-not-found/empty-queue, audio-playing state.

### Section 8 — `08 · Profile & Progress` (4 frames)
- Progress, Profile Overview, Edit Profile, Achievements. Build from `ProgressRing`, `Badge`, `Avatar`, `ListRow`. Add: signed-out profile, locked achievement state.

### Section 9 — `09 · Purchase` (5 frames)
- **Dedupe:** 2 Paywalls (keep Polished). Current packs: only **IELTS** pack detail. **Add:** TOEFL + SAT pack details, **All-Exams bundle** screen, restore-purchases, purchase-declined/error. Reflect locked pricing: $9.99/pack, $24.99 bundle, one-time (no subscriptions).
- Componentize `PriceCard`/`PackCard`.

### Section 10 — `10 · Settings, Support & System` (14 frames)
- Largest bucket: Settings (Notifications, Daily Goal, Accessibility, Data & Privacy), Support (Help, FAQ, Contact, Submitted), System (App Loading, Offline, Generic Error, Delete-Account confirm, Restore-Backup confirm).
- Build almost entirely from `ListRow` + `Toggle` + `Sheet` + `Banner`. **Consistency pass** is the main win here (14 screens, same primitives). Add: any missing toggle/confirm states, success/failure toasts.

---

## Cross-cutting QA gate (every screen must pass)
- **Contrast** AA (4.5:1 text / 3:1 large+UI) in **both** modes.
- **Touch targets** ≥ **48pt** (`layout.minTouchTarget`; SelectionCard already 72pt — keep).
- **Dark mode** parity from a single mode toggle (not hand-painted) — Dark is canonical, Light derived.
- **States complete:** default · loading · empty · error · success for every data screen.
- **Motion notes** respect Reduce-Motion (collapse → cross-fade); durations from a `motion` token.
- **Non-punitive:** no red in any assessment/feedback path; correction = `caution` + icon + motion (3 channels). Red is `destructive`, confirmations only. No error haptic on wrong answers.
- **No emoji** in UI; all icons are Lucide components.
- **Everything bound:** 0 raw hex, 0 unbound text, 0 detached instances — verified by [`.design-specs/figma-binding-audit.js`](../.design-specs/figma-binding-audit.js) returning `gate: PASS` for the page.

## Definition of "code-ready" (the exit bar before any RN code)
1. Every color/space/radius/type = **variable**; every icon = **component**; every screen = **instances**, no bespoke trees.
2. Light + Dark both ship from **modes**.
3. **Code Connect** maps each library component → its RN counterpart.
4. [`.design-specs/figma-binding-audit.js`](../.design-specs/figma-binding-audit.js) returns `gate: PASS` (`rawFills:0, textBound===textTotal, emojiTextNodes:0`) for every screen on the page — not a sample, all of them.
5. Figma variable/type names match `tokens.ts` **1:1** (so Code Connect needs no translation); the 4 code↔doc divergences (see Canonical sources) are resolved and `DESIGN_SYSTEM.md` updated to match.

## Recommended sequence
**Phase 0 first (blocking).** Then pages in dependency order so components harden on the highest-traffic
screens early: **3 Home → 4 Learn Loop → 5 Session → 7 Words → 8 Profile → 1 Onboarding → 6 Curriculum →
9 Purchase → 2 Auth → 10 System.** (System last: it's mostly repetition of `ListRow`, so it's fastest once
the library is proven.)

## Effort / risk notes
- Phase 0 is **~25–30%** of total effort (revised down from 40%): the token system isn't being *invented* — `tokens.ts` + `DESIGN_SYSTEM.md` already specify it completely. Phase 0 is a **port + bind**, not a design exercise. Still blocking: resist Section work before the Home exit-gate passes.
- **Resolve the 4 code↔doc divergences first** (Canonical sources) — binding type before the Playfair/Inter call is decided = guaranteed rework.
- Icons are **adopt-not-redraw** (Lucide subset import) — cheaper than the old plan assumed.
- Biggest remaining cost: **swapping 15+ emoji per screen** → Lucide components across ~45 screens.
- Duplicates inflate the "59 screens" number — after dedupe, expect ~45 canonical screens.
- **Concurrent-edit hazard:** if multiple agents/sessions touch this Figma file at once, variable/component edits can race (same lesson as git `add -A`). One owner per page; don't fan parallel *writes* at the same node tree.

## Done this pass (2026-06-09)
- ✅ Housekeeping: deleted empty `✨ Hi-Fi` + `🎨 Design System` pages; removed stray `Design_System` rect + empty duplicate `Legacy Components` section on Components page. File now 14 clean pages.
- ✅ Audit gate built + proven (`.design-specs/figma-binding-audit.js`); Home red baseline captured.
- ✅ Foundation rewritten to port `tokens.ts` / `DESIGN_SYSTEM.md` exactly (was: invent-from-legacy-paint-styles).
- ✅ 4 code↔doc divergences surfaced; 3 deferred decisions resolved; drag-drop un-cut (it's MVP per the doc).

---
*Audit basis: live Figma read 2026-06-09 (14 pages; variables=0; Home `gate: FAIL` rawFills 76 / textBound 0/51 / emoji 15 / instances 0; Components page = brand + 13 feature-illustration `icon_*` frames + 5 legacy frames, 0 real COMPONENTs). Canonical token source = `tokens.ts`. Re-audit with [`.design-specs/figma-binding-audit.js`](../.design-specs/figma-binding-audit.js) to verify progress.*
