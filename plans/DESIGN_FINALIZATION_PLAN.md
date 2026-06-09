# LexiTap — Design Finalization Plan

**Status:** accepted · **Created:** 2026-06-09 · **Owner:** Ryan + design agent
**Goal:** Lock a *code-ready* design so coding never loops back to "the design isn't good."
**Intent (Ryan, 2026-06-09):** complete + comprehensive design in Figma **before any RN code** — full-design path, not targeted polish. (Burned before by coding-before-design.) Figma is the source of truth for visuals; existing RN screens are re-done against the locked design.
**Figma file:** `Jx0TLmVpgmsjtMA3uB6uS4` · 16 pages (10 functional screen pages + Wireframes / Tokens / Typography / Components / Hi-Fi(empty) / Design System(empty))

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

### Resolved decisions (were deferred — now decided, so we don't rebuild components)
1. **Proficiency screen — CUT** (D1, already decided in memory 2026-05-31; off-spec: CEFR-band vs frequency-rank). §1 flow below has it removed. Do **not** build a proficiency component.
2. **Known/learned metric — ONE noun, explicit denominator.** Use **"known"** everywhere; always show the list it's measured against. Home = `1,240 / 3,000 known · Core 3,000`; Knowledge Map = `~2,400 known · across all lists` (bigger because it spans full CEFR, not just Core 3,000). The two numbers differ by *denominator*, not by *concept* — never two different verbs.
3. **Learn-loop input — TAP only for v1; drag-drop (LN-2) CUT.** Passive recognition is a hard rule; tap is the simpler, more accessible, single `AnswerOption` component. Drag-drop adds motor load + a second component surface for no v1 benefit → defer post-launch. §4 builds one tap-based `AnswerOption`.

---

## Phase 0 — Foundation (cross-cutting · hard dependency for all 10 sections)

### 0.0 Build the audit gate FIRST (blocks every other exit check)
- The QA gate, the "code-ready" bar, and every per-section ⑤ depend on an objective binding audit. **It now exists:** [`.design-specs/figma-binding-audit.js`](../.design-specs/figma-binding-audit.js).
- It's a `use_figma` script (runs in the Figma plugin context, not node). Paste its body into `use_figma` (`skillNames:'figma-use'`); set `TARGET_PAGE` or run against the current page.
- Returns per-screen + page totals: `rawFills`, `textBound/textTotal`, `emojiTextNodes`, `instances`, and a `gate: PASS|FAIL`. **A page is code-ready only when `gate === 'PASS'`** (every screen: `rawFills:0`, `textBound===textTotal`, `emojiTextNodes:0`).
- Run it ONCE now against Home (156:2) to capture the red baseline; every later gate compares against it.

### 0.1 Tokens → Variables (the keystone)
- Create variable collections with **modes**: `Color` (modes: Light, Dark), `Spacing`, `Radius`, `Size`, `Type`.
- **Two-tier color:** primitives (`color/navy/700`, `color/turquoise/500`, `color/gold/500`, full grey ramp)
  → **semantic** aliases (`bg/canvas`, `bg/surface`, `bg/surface-raised`, `text/primary`, `text/secondary`,
  `text/tertiary`, `border/subtle`, `border/strong`, `accent`, `accent-pressed`, `on-accent`,
  `success`, `warning`, `disabled`). Screens bind to **semantic only**.
- **Parity with web:** mirror `website/public/styles.css` custom props 1:1 (same names) so web + app + Figma share one palette. Collapse the 14 raw Home colors into this set.
- Scopes set explicitly per variable (FRAME_FILL/TEXT_FILL/GAP/CORNER_RADIUS) — never ALL_SCOPES.

### 0.2 Type system (reconcile + bind)
- One scale: `Display, H1, H2, H3, Body, Body Strong, Caption, Label, Word`. **Delete `Body Regular (alt)`** and the `Heading N` duplicates.
- Each style: font/size/line-height/weight, color bound to `text/*` variable. Specimens on Typography page must equal the bound styles (currently they don't).

### 0.3 Elevation / effects
- Name the 3 empty effect styles → `elevation/sm`, `elevation/md`, `elevation/lg` (+ optional `focus-ring`). Define a deliberate shadow scale; bind cards/sheets/modals to it.

### 0.4 Icon unification (explicit user ask)
- **Pick ONE system:** the custom 24px-grid `icon_*` set (already 16 drawn). **Ban emoji in UI.**
- Rebuild each icon as a **component** on a 24×24 frame, single `VECTOR`, stroke/fill bound to `text/*` or `accent` so color follows token + mode. Variant by name; size via `Size` token (16/20/24/28).
- Inventory every emoji currently in screens → map to an icon component → swap. Add missing glyphs (streak, fire, lock, check, chevrons, tab-bar set, etc.).

### 0.5 Component library (`figma-generate-library`)
Build token-bound, light/dark-via-mode, auto-layout components. Minimum set:
`Button` (primary/secondary/ghost/destructive × default/pressed/disabled × +icon),
`Card`, `ListRow` (w/ leading icon, trailing chevron/toggle/value), `Input/Field` (default/focus/error),
`TabBar` + `TabItem`, `TopBar/NavHeader`, `Chip/Tag`, `ProgressBar`, `ProgressRing`, `Badge/Pill`,
`Sheet/Modal` + `Backdrop`, `AnswerOption` (idle/selected/correct/incorrect — *passive recognition only, no TextInput*),
`WordCard`, `SegmentedControl`, `Avatar`, `Toast/Banner` (success/warning/offline), `EmptyState`, `Stepper/Dots`.
- Each: documented variant props, named layers, `description` filled (feeds Code Connect).

### 0.6 Layout system
- Canonical artboard (e.g. 393×852, iPhone 15). Safe-area top/bottom tokens. 4pt spacing grid via `Spacing` vars.
- **Auto-layout everywhere** (no absolute x/y for in-screen content) so reflow/dark-mode/text-length never breaks layout.

### 0.7 Code Connect prep (`figma-code-connect`) — the anti-loop bridge
- Name Figma components to match planned RN components (`Button`, `Card`, `ListRow`…).
- Stub the RN component inventory now; map `figma.connect()` so design changes surface as code diffs, not silent drift. This is what guarantees "design once, code once."

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

### Section 3 — `03 · Home` (3 frames)
- Current: Home (Polished), All Caught Up, annotation. **Gaps:** first-run (0 reviews due), reviews-due badge state, streak-at-risk state.
- **Apply the known/learned decision (decision 2):** Home = `1,240 / 3,000 known · Core 3,000`; KMap = `~2,400 known · across all lists`. One verb ("known"), denominator always shown. Update both screens' copy to match.

### Section 4 — `04 · Learn Loop` (10 frames)
- **Dedupe:** Learn Card / Quiz / Feedback each have Hi-Fi + Redesign copies → collapse to one canonical each.
- Build from `WordCard`, `AnswerOption` (tap-only — decision 3), `ProgressBar`, `Sheet` (Forgiveness). **Passive recognition only — no TextInput** (hard rule).
- **Add states:** correct/incorrect/timeout, last-card-of-session. **Drag-drop (LN-2) CUT for v1** — delete those frames after preserving anything reusable.

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
- **Touch targets** ≥ 44pt (SelectionCard already 72pt — keep).
- **Dark mode** parity from a single mode toggle (not hand-painted).
- **States complete:** default · loading · empty · error · success for every data screen.
- **Motion notes** respect Reduce-Motion; durations from a motion token.
- **No emoji** in UI; all icons are components.
- **Everything bound:** 0 raw hex, 0 unbound text, 0 detached instances — verified by [`.design-specs/figma-binding-audit.js`](../.design-specs/figma-binding-audit.js) returning `gate: PASS` for the page.

## Definition of "code-ready" (the exit bar before any RN code)
1. Every color/space/radius/type = **variable**; every icon = **component**; every screen = **instances**, no bespoke trees.
2. Light + Dark both ship from **modes**.
3. **Code Connect** maps each library component → its RN counterpart.
4. [`.design-specs/figma-binding-audit.js`](../.design-specs/figma-binding-audit.js) returns `gate: PASS` (`rawFills:0, textBound===textTotal, emojiTextNodes:0`) for every screen on the page — not a sample, all of them.
5. Web (`styles.css`) ↔ Figma variables names match.

## Recommended sequence
**Phase 0 first (blocking).** Then pages in dependency order so components harden on the highest-traffic
screens early: **3 Home → 4 Learn Loop → 5 Session → 7 Words → 8 Profile → 1 Onboarding → 6 Curriculum →
9 Purchase → 2 Auth → 10 System.** (System last: it's mostly repetition of `ListRow`, so it's fastest once
the library is proven.)

## Effort / risk notes
- Phase 0 is ~40% of total effort and de-risks everything else. Resist starting Section 1 before the Home exit-gate passes.
- Biggest hidden cost: **icon unification** (audit + redraw + swap every emoji). Front-load it in 0.4.
- Duplicates inflate the "59 screens" number — after dedupe, expect ~45 canonical screens.

---
*Audit basis: live Figma read 2026-06-09 (variables=0, bound styles=0 on polished Home/Paywall, emoji icons, components=0). Re-audit with [`.design-specs/figma-binding-audit.js`](../.design-specs/figma-binding-audit.js) to verify progress.*
